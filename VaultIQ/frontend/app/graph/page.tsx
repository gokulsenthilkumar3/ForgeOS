'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import useSWR from 'swr';
import { apiFetch } from '../../lib/api';
import {
  X, Cpu, Monitor, Printer, Server, Smartphone, Tablet,
  Mouse, Keyboard, HelpCircle, Maximize2, RotateCcw,
  ChevronRight, Map, Search,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeKind = 'user' | 'asset';

interface Asset {
  id: string; tagId: string; modelName: string; type: string;
  status: string; location: string; assignedTo?: string | null;
  purchasePrice: number; purchaseDate: string; serialNumber: string;
}

interface ActivityLog {
  id: string; user: string; tagId: string; type: string; timestamp: string;
}

interface MaintenanceTicket {
  id: string; assetId: string; assetName: string; tagId: string;
  issue: string; priority: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; status: string;
  createdAt: string; resolvedAt?: string;
}

interface GraphNode {
  id: string; kind: NodeKind; label: string;
  assetType?: string; assetStatus?: string; assetData?: Asset;
  x: number; y: number; vx: number; vy: number; pinned?: boolean;
  opacity: number;
}

interface GraphEdge {
  id: string; source: string; target: string;
  edgeType: 'assigned' | 'checkout' | 'checkin' | 'maintenance' | 'retired';
  label: string;
}

// ─── SVG Icons for Assets ─────────────────────────────────────────────────────
const AssetIcon = ({ type, size = 16, color }: { type: string; size?: number; color?: string }) => {
  const props = { size, color, strokeWidth: 1.5 };
  switch (type) {
    case 'Laptop': return <Monitor {...props} />;
    case 'Monitor': return <Monitor {...props} />;
    case 'Phone': return <Smartphone {...props} />;
    case 'Tablet': return <Tablet {...props} />;
    case 'Printer': return <Printer {...props} />;
    case 'Server': return <Server {...props} />;
    case 'Mouse': return <Mouse {...props} />;
    case 'Keyboard': return <Keyboard {...props} />;
    default: return <Cpu {...props} />;
  }
};

const AssetIconSvg = ({ type, color }: { type: string; color: string }) => {
  switch (type) {
    case 'Laptop': return <path d="M4 14v-9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9M2 18h20M12 18v-2M8 18v-2M16 18v-2" fill="none" stroke={color} strokeWidth="1.5" />;
    case 'Monitor': return <rect x="2" y="3" width="20" height="14" rx="2" fill="none" stroke={color} strokeWidth="1.5" />;
    case 'Phone': return <rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke={color} strokeWidth="1.5" />;
    case 'Tablet': return <rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke={color} strokeWidth="1.5" />;
    case 'Server': return <rect x="2" y="2" width="20" height="8" rx="2" fill="none" stroke={color} strokeWidth="1.5" />;
    case 'Printer': return <rect x="6" y="14" width="12" height="8" fill="none" stroke={color} strokeWidth="1.5" />;
    default: return <circle cx="12" cy="12" r="8" fill="none" stroke={color} strokeWidth="1.5" />;
  }
};

// ─── Constants ────────────────────────────────────────────────────────────────
const ASSET_COLORS: Record<string, string> = {
  Laptop: '#a371f7', Monitor: '#39d353', Phone: '#58a6ff',
  Tablet: '#f0883e', Printer: '#ffa657', Server: '#ff7b72',
  Mouse: '#8b949e', Keyboard: '#8b949e', Other: '#8b949e',
};

const EDGE_META: Record<string, { stroke: string; dash: string; w: number }> = {
  assigned:    { stroke: '#58a6ff', dash: 'none', w: 2 },
  checkout:    { stroke: '#58a6ff', dash: '8,5',  w: 1.5 },
  checkin:     { stroke: '#ffa657', dash: '8,5',  w: 1.5 },
  maintenance: { stroke: '#ff7b72', dash: '8,5',  w: 1.5 },
  retired:     { stroke: '#8b949e', dash: '4,5',  w: 1 },
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#3fb950', MAINTENANCE: '#d29922', RETIRED: '#8b949e', LOST: '#ff7b78',
};

const NODE_R  = 32;
const RECT_W  = 96;
const RECT_H  = 52;

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000)    return 'just now';
  if (d < 3600000)  return `${Math.floor(d / 60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
  return `${Math.floor(d / 86400000)}d ago`;
}

// ─── Build graph ──────────────────────────────────────────────────────────────
function buildGraph(assets: Asset[], activity: ActivityLog[], W: number, H: number) {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const userSet = new Set<string>();

  assets.forEach(a  => { if (a.assignedTo) userSet.add(a.assignedTo); });
  activity.forEach(ac => { if (ac.user) userSet.add(ac.user); });

  const cx = W / 2, cy = H / 2;
  const userArr = Array.from(userSet);

  userArr.forEach((name, i) => {
    const angle = (i / userArr.length) * Math.PI * 2;
    const r = Math.min(W, H) * 0.20;
    nodes.push({
      id: 'user:' + name, kind: 'user', label: name,
      x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 30,
      y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 30,
      vx: 0, vy: 0, opacity: 0,
    });
  });

  assets.forEach((a, i) => {
    const angle = (i / assets.length) * Math.PI * 2;
    const r = Math.min(W, H) * 0.40;
    nodes.push({
      id: 'asset:' + a.id, kind: 'asset', label: a.modelName,
      assetType: a.type, assetStatus: a.status, assetData: a,
      x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 50,
      y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 50,
      vx: 0, vy: 0, opacity: 0,
    });
    if (a.assignedTo) {
      edges.push({ id: `assign:${a.id}`, source: 'user:' + a.assignedTo, target: 'asset:' + a.id, edgeType: 'assigned', label: 'assigned' });
    }
  });

  const actTypes = ['checkout', 'checkin', 'maintenance', 'retired'] as const;
  activity.forEach(ac => {
    if (!actTypes.includes(ac.type as any)) return;
    const assetNode = nodes.find(n => n.kind === 'asset' && n.assetData?.tagId === ac.tagId);
    if (!assetNode) return;
    edges.push({ id: `act:${ac.id}`, source: 'user:' + ac.user, target: assetNode.id, edgeType: ac.type as any, label: `${ac.type} ${timeAgo(ac.timestamp)}` });
  });

  return { nodes, edges };
}

// ─── Physics ──────────────────────────────────────────────────────────────────
function runPhysics(nodes: GraphNode[], edges: GraphEdge[], cx: number, cy: number): GraphNode[] {
  const K_REPEL = 5000, K_ATTRACT = 0.025, REST = 180, K_GRAVITY = 0.004, DAMP = 0.86;
  const next = nodes.map(n => ({ ...n }));

  for (let i = 0; i < next.length; i++) {
    if (next[i].pinned) continue;
    let fx = 0, fy = 0;
    for (let j = 0; j < next.length; j++) {
      if (i === j) continue;
      const dx = next[i].x - next[j].x, dy = next[i].y - next[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const f = K_REPEL / (dist * dist);
      fx += (dx / dist) * f; fy += (dy / dist) * f;
    }
    edges.forEach(e => {
      const isSrc = e.source === next[i].id, isTgt = e.target === next[i].id;
      if (!isSrc && !isTgt) return;
      const other = next.find(n => n.id === (isSrc ? e.target : e.source));
      if (!other) return;
      const dx = other.x - next[i].x, dy = other.y - next[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const f = K_ATTRACT * (dist - REST);
      fx += (dx / dist) * f; fy += (dy / dist) * f;
    });
    fx += (cx - next[i].x) * K_GRAVITY;
    fy += (cy - next[i].y) * K_GRAVITY;
    next[i].vx = (next[i].vx + fx) * DAMP;
    next[i].vy = (next[i].vy + fy) * DAMP;
    next[i].x += next[i].vx;
    next[i].y += next[i].vy;
  }
  return next;
}

// ─── Bezier control point ─────────────────────────────────────────────────────
function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular offset scales with distance
  const offset = Math.min(len * 0.25, 60);
  const cx = mx - (dy / len) * offset;
  const cy = my + (dx / len) * offset;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GraphPage() {
  const [nodes, setNodes]           = useState<GraphNode[]>([]);
  const [edges, setEdges]           = useState<GraphEdge[]>([]);
  const [tickets, setTickets]       = useState<MaintenanceTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType]     = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterKind, setFilterKind]     = useState('All');
  const [zoom, setZoom]   = useState(1);
  const [pan, setPan]     = useState({ x: 0, y: 0 });
  const [dragging, setDragging]   = useState<{ nodeId: string; ox: number; oy: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart]   = useState({ mx: 0, my: 0, px: 0, py: 0 });
  const [loading, setLoading]     = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const nodesRef    = useRef<GraphNode[]>([]);
  const rafRef      = useRef<number>(0);
  const settledRef  = useRef(false);
  const svgRef      = useRef<SVGSVGElement>(null);
  const ticksRef    = useRef(0);
  const pageRef     = useRef<HTMLDivElement>(null);
  const prevW       = useRef<number>(0);
  const prevH       = useRef<number>(0);

  const getWH = () => ({
    W: typeof window !== 'undefined' ? window.innerWidth  - (selectedId ? 360 : 0) - 220 : 900,
    H: typeof window !== 'undefined' ? window.innerHeight - 56 : 600,
  });

  // Init
  const { data: assetsData } = useSWR('/assets?limit=1000', url => apiFetch(url));
  const { data: activityData } = useSWR('/assets/activity', url => apiFetch(url));
  const { data: ticketsData } = useSWR('/maintenance', url => apiFetch(url));

  useEffect(() => {
    if (!assetsData || !activityData || !ticketsData) return;

    const { W, H } = getWH();
    prevW.current = W;
    prevH.current = H;

    const assets = assetsData.data.map((a: any) => ({
      ...a,
      type: a.type.name,
      location: a.location.name,
    }));
    const activity = Array.isArray(activityData) ? activityData : (activityData?.data || []);
    
    const { nodes: n, edges: e } = buildGraph(assets, activity, W, H);
    setEdges(e);
    setTickets(ticketsData);
    nodesRef.current = n;
    setNodes([...n]);
    ticksRef.current = 0;
    settledRef.current = false;
    setTimeout(() => setLoading(false), 220);
  }, [assetsData, activityData, ticketsData]);

  useEffect(() => {
    const handler = () => {
      if (!settledRef.current) return;
      const { W, H } = getWH();
      nodesRef.current = nodesRef.current.map(n => ({
        ...n,
        x: n.x * (W / prevW.current),
        y: n.y * (H / prevH.current),
      }));
      setNodes([...nodesRef.current]);
      prevW.current = W;
      prevH.current = H;
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [selectedId]);

  // Physics + staggered fade-in
  useEffect(() => {
    if (settledRef.current || loading) return;
    const { W, H } = getWH();
    const cx = W / 2, cy = H / 2;
    const tick = () => {
      ticksRef.current++;
      nodesRef.current = runPhysics(nodesRef.current, edges, cx, cy);
      // Staggered opacity fade-in (30ms per node index)
      nodesRef.current = nodesRef.current.map((n, i) => ({
        ...n,
        opacity: Math.min(1, (ticksRef.current - i * 1.5) / 20),
      }));
      if (ticksRef.current % 2 === 0) setNodes([...nodesRef.current]);
      if (ticksRef.current < 120) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        settledRef.current = true;
        nodesRef.current = nodesRef.current.map(n => ({ ...n, opacity: 1 }));
        setNodes([...nodesRef.current]);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [edges, loading]);

  // Fullscreen toggle
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    if (fullscreen) { el.requestFullscreen?.().catch(() => {}); }
    else { document.exitFullscreen?.().catch(() => {}); }
  }, [fullscreen]);

  // ── Visibility filters ───────────────────────────────────────────────────
  const allAssets   = (assetsData?.data || []).map((a: any) => ({ ...a, type: a.type.name, location: a.location.name }));
  const allActivity = Array.isArray(activityData) ? activityData : (activityData?.data || []);
  const userCount   = nodes.filter(n => n.kind === 'user').length;
  const assetCount  = nodes.filter(n => n.kind === 'asset').length;

  const visibleNodes = nodes.filter(n => {
    if (filterKind === 'Users'  && n.kind !== 'user')  return false;
    if (filterKind === 'Assets' && n.kind !== 'asset') return false;
    if (n.kind === 'asset') {
      if (filterType   !== 'All' && n.assetType   !== filterType)   return false;
      if (filterStatus !== 'All' && n.assetStatus !== filterStatus) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return n.label.toLowerCase().includes(q) || n.assetData?.tagId?.toLowerCase().includes(q) || false;
    }
    return true;
  });
  const visibleIds = new Set(visibleNodes.map(n => n.id));

  const connectedEdges = hoveredId
    ? new Set(edges.filter(e => e.source === hoveredId || e.target === hoveredId).map(e => e.id))
    : null;
  const connectedNodes = hoveredId
    ? new Set(edges.filter(e => e.source === hoveredId || e.target === hoveredId).flatMap(e => [e.source, e.target]))
    : null;

  const searchMatchIds = search
    ? new Set(visibleNodes.map(n => n.id))
    : null;

  // ── Drag ────────────────────────────────────────────────────────────────
  const onNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const svg = svgRef.current; if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    const node = nodesRef.current.find(n => n.id === nodeId); if (!node) return;
    setDragging({ nodeId, ox: svgP.x - node.x, oy: svgP.y - node.y });
    nodesRef.current = nodesRef.current.map(n => n.id === nodeId ? { ...n, pinned: true } : n);
  }, []);

  const onSvgMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const svg = svgRef.current; if (!svg) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      nodesRef.current = nodesRef.current.map(n =>
        n.id === dragging.nodeId ? { ...n, x: svgP.x - dragging.ox, y: svgP.y - dragging.oy, vx: 0, vy: 0 } : n
      );
      setNodes([...nodesRef.current]);
    } else if (isPanning) {
      setPan({ x: panStart.px + (e.clientX - panStart.mx), y: panStart.py + (e.clientY - panStart.my) });
    }
  }, [dragging, isPanning, panStart]);

  const onSvgMouseUp = useCallback(() => {
    if (dragging) {
      nodesRef.current = nodesRef.current.map(n => n.id === dragging.nodeId ? { ...n, pinned: false } : n);
      setDragging(null);
    }
    setIsPanning(false);
  }, [dragging]);

  const onBgMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging) {
      setIsPanning(true);
      setPanStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
      setSelectedId(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.25, z - e.deltaY * 0.0008)));
  };

  // ── Detail panel ─────────────────────────────────────────────────────────
  const selectedNode = nodes.find(n => n.id === selectedId);

  const detailContent = (() => {
    if (!selectedNode) return null;

    if (selectedNode.kind === 'user') {
      const userName  = selectedNode.label;
      const userAssets = allAssets.filter((a: Asset) => a.assignedTo === userName);
      const totalVal   = userAssets.reduce((s: number, a: Asset) => s + a.purchasePrice, 0);
      const activeCount = userAssets.filter((a: Asset) => a.status === 'ACTIVE').length;
      return (
        <>
          <div className="dp-hero" style={{ background: 'linear-gradient(135deg,rgba(88,166,255,0.18),rgba(88,166,255,0.04))' }}>
            <div className="dp-avatar user-avatar">{userName.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase()}</div>
            <div className="dp-name">{userName}</div>
            <div className="dp-sub">Team Member</div>
            <div className="dp-mini-stats">
              <div className="dp-stat"><b>{userAssets.length}</b><span>Assets</span></div>
              <div className="dp-stat"><b>₹{(totalVal/1000).toFixed(0)}K</b><span>Value</span></div>
              <div className="dp-stat"><b>{activeCount}</b><span>Active</span></div>
            </div>
          </div>
          <div className="dp-body">
            <div className="dp-section-label">Assigned Assets</div>
            {userAssets.length === 0 && <div className="dp-empty">No assets assigned</div>}
            {userAssets.map((a: Asset) => (
              <div key={a.id} className="dp-asset-card glass">
                <div className="dp-asset-color-bar" style={{ background: ASSET_COLORS[a.type] || '#8b949e' }} />
                <div className="dp-asset-info">
                  <span className="dp-asset-name">{a.modelName}</span>
                  <span className="dp-asset-type">{a.type} · {a.tagId}</span>
                </div>
                <span className="dp-status-dot" style={{ color: STATUS_COLORS[a.status] }}>{a.status}</span>
              </div>
            ))}
          </div>
        </>
      );
    }

    const a = selectedNode.assetData!;
    const assetActivity = allActivity.filter((ac: ActivityLog) => ac.tagId === a.tagId);
    const assetTickets  = tickets.filter((t: MaintenanceTicket) => t.assetId === a.id && t.status !== 'RESOLVED');
    const accentColor   = ASSET_COLORS[a.type] || '#8b949e';

    return (
      <>
        <div className="dp-hero" style={{ background: `linear-gradient(135deg,${accentColor}22,${accentColor}06)` }}>
          <div className="dp-avatar asset-avatar" style={{ background: accentColor + '22', color: accentColor }}>
            <AssetIcon type={a.type} size={26} />
          </div>
          <div className="dp-name">{a.modelName}</div>
          <div className="dp-tag">{a.tagId}</div>
          <div className="dp-mini-stats">
            <div className="dp-stat"><b style={{ color: STATUS_COLORS[a.status] }}>{a.status}</b><span>Status</span></div>
            <div className="dp-stat"><b>₹{(a.purchasePrice/1000).toFixed(0)}K</b><span>Value</span></div>
            <div className="dp-stat"><b>{a.type}</b><span>Type</span></div>
          </div>
        </div>
        <div className="dp-body">
          <div className="dp-kv-grid">
            <div className="dp-kv"><span>Location</span><b>{a.location}</b></div>
            <div className="dp-kv"><span>Assigned</span><b>{a.assignedTo || '—'}</b></div>
            <div className="dp-kv"><span>Purchased</span><b>{a.purchaseDate}</b></div>
            <div className="dp-kv"><span>Serial</span><b>{a.serialNumber}</b></div>
          </div>

          {assetTickets.length > 0 && (
            <>
              <div className="dp-section-label" style={{ color: '#ff7b72' }}>⚠ Open Tickets</div>
              {assetTickets.map(t => {
                const age = timeAgo(t.createdAt);
                return (
                  <div key={t.id} className="dp-ticket-card">
                    <div className="dp-ticket-header">
                      <span className="dp-ticket-pri" style={{ color: t.priority === 'CRITICAL' ? '#ff7b72' : t.priority === 'HIGH' ? '#ffa657' : '#d29922' }}>{t.priority}</span>
                      <span className="dp-ticket-age">{age}</span>
                    </div>
                    <div className="dp-ticket-issue">{t.issue}</div>
                  </div>
                );
              })}
            </>
          )}

          {assetActivity.length > 0 && (
            <>
              <div className="dp-section-label">Activity Timeline</div>
              <div className="dp-timeline">
                {assetActivity.slice(0, 6).map((ac: ActivityLog, i: number) => {
                  const edgeMeta = EDGE_META[ac.type as keyof typeof EDGE_META];
                  const dotColor = edgeMeta?.stroke || '#8b949e';
                  return (
                    <div key={ac.id} className="dp-timeline-item">
                      <div className="dp-tl-line">
                        <div className="dp-tl-dot" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}88` }} />
                        {i < assetActivity.length - 1 && <div className="dp-tl-connector" />}
                      </div>
                      <div className="dp-tl-content">
                        <span className="dp-tl-type" style={{ color: dotColor }}>{ac.type}</span>
                        <span className="dp-tl-user">by {ac.user}</span>
                        <span className="dp-tl-time">{timeAgo(ac.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <Link href="/inventory" className="dp-inventory-btn">
            View in Inventory <ChevronRight size={14} />
          </Link>
        </div>
      </>
    );
  })();

  // ── RENDER ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="graph-skeleton">
        <div className="graph-skeleton-bar" />
        <div className="graph-skeleton-canvas">
          <div className="graph-skeleton-text">Building graph…</div>
        </div>
        <style>{`.graph-skeleton{display:flex;flex-direction:column;height:100vh;background:var(--bg-primary)}.graph-skeleton-bar{height:52px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.07)}.graph-skeleton-canvas{flex:1;display:flex;align-items:center;justify-content:center}.graph-skeleton-text{color:rgba(255,255,255,0.25);font-size:0.9rem;letter-spacing:2px;animation:pulse 1.2s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.8}}`}</style>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="graph-page">
      {/* ── Toolbar ── */}
      <div className="graph-toolbar">
        {/* Search */}
        <div className="tb-search">
          <Search size={13} className="tb-search-icon" />
          <input className="tb-search-input" placeholder="Search nodes…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="tb-search-clear" onClick={() => setSearch('')}><X size={12} /></button>}
        </div>

        {/* Pill tabs */}
        <div className="tb-pills">
          {(['All','Users','Assets','Edges'] as const).map(v => (
            <button key={v}
              className={`tb-pill ${filterKind === v ? 'active' : ''}`}
              onClick={() => setFilterKind(v)}>
              {v}
              {v === 'Users'  && <span className="tb-badge">{userCount}</span>}
              {v === 'Assets' && <span className="tb-badge">{assetCount}</span>}
            </button>
          ))}
        </div>

        {/* Custom dropdowns */}
        <div className="tb-dropdowns">
          <div className="tb-dd-wrap">
            <span className="tb-dd-label">Type</span>
            <select className="tb-dd" value={filterType} onChange={e => setFilterType(e.target.value)}>
              {['All','Laptop','Monitor','Phone','Tablet','Printer','Server','Mouse','Keyboard','Other'].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="tb-dd-wrap">
            <span className="tb-dd-label">Status</span>
            <select className="tb-dd" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {['All','ACTIVE','MAINTENANCE','RETIRED','LOST'].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Icon buttons */}
        <div className="tb-actions">
          <button className="tb-icon-btn" title="Reset view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={15} /></button>
          <button className="tb-icon-btn" title="Fullscreen" onClick={() => setFullscreen(f => !f)}><Maximize2 size={15} /></button>
          <button className={`tb-icon-btn ${legendOpen ? 'active' : ''}`} title="Legend" onClick={() => setLegendOpen(o => !o)}><Map size={15} /></button>
        </div>
      </div>

      <div className="graph-body">
        {/* ── SVG Canvas ── */}
        <svg
          ref={svgRef}
          className="graph-canvas"
          style={{ cursor: isPanning ? 'grabbing' : dragging ? 'grabbing' : 'grab' }}
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
          onMouseLeave={onSvgMouseUp}
          onMouseDown={onBgMouseDown}
          onWheel={onWheel}
        >
          <defs>
            {/* Dot-grid background pattern */}
            <pattern id="dot-grid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.08)" />
            </pattern>
            {/* Radial center glow */}
            <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#1d4ed8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--bg-secondary)" stopOpacity="0" />
            </radialGradient>
            {/* Vignette */}
            <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
              <stop offset="50%" stopColor="var(--bg-secondary)" stopOpacity="0" />
              <stop offset="100%" stopColor="var(--bg-secondary)" stopOpacity="0.55" />
            </radialGradient>
            {/* Blur filter for nodes on hover */}
            <filter id="glow-sm" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-md" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Edge gradient (reused per edge via inline stop colors) */}
            {edges.map(edge => {
              const src = nodes.find(n => n.id === edge.source);
              const tgt = nodes.find(n => n.id === edge.target);
              const sc  = src?.kind === 'user' ? '#58a6ff' : ASSET_COLORS[src?.assetType || ''] || '#8b949e';
              const tc  = tgt?.kind === 'user' ? '#58a6ff' : ASSET_COLORS[tgt?.assetType || ''] || '#8b949e';
              return (
                <linearGradient key={`grad-${edge.id}`} id={`grad-${edge.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor={sc} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={tc} stopOpacity="0.9" />
                </linearGradient>
              );
            })}
            {/* Arrowhead markers */}
            {Object.entries(EDGE_META).map(([type, meta]) => (
              <marker key={type} id={`arrow-${type}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill={meta.stroke} opacity="0.7" />
              </marker>
            ))}
          </defs>

          {/* Background layers */}
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
          <rect width="100%" height="100%" fill="url(#center-glow)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {filterKind !== 'Users' && filterKind !== 'Assets' &&
              edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target)).map(edge => {
                const src = nodesRef.current.find(n => n.id === edge.source);
                const tgt = nodesRef.current.find(n => n.id === edge.target);
                if (!src || !tgt) return null;
                const meta = EDGE_META[edge.edgeType];
                const isHigh = connectedEdges ? connectedEdges.has(edge.id) : true;
                const dimmed = hoveredId && !isHigh;
                const mx = (src.x + tgt.x) / 2, my = (src.y + tgt.y) / 2;
                const path = bezierPath(src.x, src.y, tgt.x, tgt.y);
                const dist = Math.sqrt(Math.pow(src.x - tgt.x, 2) + Math.pow(src.y - tgt.y, 2));
                return (
                  <g key={edge.id} opacity={dimmed ? 0.07 : isHigh ? 1 : 0.5}
                     style={{ transition: 'opacity 0.2s' }}>
                    {/* Glow on hover */}
                    {isHigh && hoveredId && (
                      <path d={path} fill="none" stroke={meta.stroke} strokeWidth={6} opacity={0.15} />
                    )}
                    <path
                      d={path}
                      fill="none"
                      stroke={`url(#grad-${edge.id})`}
                      strokeWidth={hoveredId && isHigh ? meta.w + 1.5 : meta.w}
                      strokeDasharray={meta.dash === 'none' ? undefined : meta.dash}
                      markerEnd={dist > 60 ? `url(#arrow-${edge.edgeType})` : undefined}
                      className={edge.edgeType === 'assigned' ? 'edge-flow' : ''}
                    />
                    {/* Pill label */}
                    <rect x={mx - 26} y={my - 8} width={52} height={14} rx={7}
                      fill="var(--bg-secondary)" fillOpacity="0.75" stroke={meta.stroke} strokeWidth="0.5" strokeOpacity="0.4" />
                    <text x={mx} y={my + 1} textAnchor="middle" fontSize="8" fill={meta.stroke}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {edge.label}
                    </text>
                  </g>
                );
              })
            }

            {/* Nodes */}
            {visibleNodes.map((node, idx) => {
              const isSelected   = selectedId === node.id;
              const isHovered    = hoveredId  === node.id;
              const dimmed       = hoveredId ? (!connectedNodes?.has(node.id) && node.id !== hoveredId) : false;
              const searchMiss   = searchMatchIds && !searchMatchIds.has(node.id);
              const hasTicket    = tickets.some(t => t.status !== 'RESOLVED' && node.assetData?.id === t.assetId);
              const color        = node.kind === 'user' ? '#58a6ff' : (ASSET_COLORS[node.assetType!] || '#8b949e');
              const statusColor  = node.assetStatus ? STATUS_COLORS[node.assetStatus] : '#3fb950';
              const isUnassigned = node.kind === 'asset' && !node.assetData?.assignedTo;
              const applyGlow    = (isSelected || isHovered) ? 'glow-md' : undefined;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  style={{ cursor: 'pointer', transition: 'opacity 0.25s' }}
                  opacity={(dimmed || searchMiss) ? 0.1 : node.opacity}
                  filter={applyGlow ? `url(#${applyGlow})` : undefined}
                  onMouseDown={e => onNodeMouseDown(e, node.id)}
                  onClick={e => { e.stopPropagation(); setSelectedId(node.id === selectedId ? null : node.id); }}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {node.kind === 'user' ? (
                    <>
                      {/* Pulse ring on hover/select */}
                      {(isHovered || isSelected) && (
                        <circle r={NODE_R + 14} fill="none" stroke={color} strokeWidth={1.5}
                          opacity={0.35} className="pulse-ring" />
                      )}
                      {/* Outer gradient ring */}
                      <circle r={NODE_R + 4} fill="none"
                        stroke={isSelected ? color : color + '55'} strokeWidth={2.5} />
                      {/* Glassmorphism fill */}
                      <circle r={NODE_R}
                        fill="var(--bg-secondary)" fillOpacity="0.65"
                        stroke={isSelected ? color : color + '66'}
                        strokeWidth={isSelected ? 2.5 : 1.5} />
                      {/* Radial gradient shimmer */}
                      <circle r={NODE_R} fill={`url(#user-grad-${node.id})`} opacity={0.5} />
                      <defs>
                        <radialGradient id={`user-grad-${node.id}`} cx="35%" cy="30%" r="70%">
                          <stop offset="0%"   stopColor="#58a6ff" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="var(--bg-secondary)" stopOpacity="0.0" />
                        </radialGradient>
                      </defs>
                      {/* Initials */}
                      <text textAnchor="middle" dominantBaseline="central" fontSize="11"
                        fill={color} fontWeight="700" letterSpacing="1"
                        style={{ pointerEvents: 'none', userSelect: 'none', textShadow: `0 0 8px ${color}` }}>
                        {node.label.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()}
                      </text>
                      {/* Label */}
                      <text y={NODE_R + 16} textAnchor="middle" fontSize="10" fill="var(--text-primary)"
                        fontWeight="600" letterSpacing="0.3"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {node.label}
                      </text>
                      {/* Role dot */}
                      <circle cx={NODE_R - 6} cy={NODE_R - 6} r={5}
                        fill="var(--bg-secondary)" fillOpacity="0.8" stroke={node.label === 'Admin User' ? '#3fb950' : '#39d353'} strokeWidth={1.5} />
                    </>
                  ) : (
                    <>
                      {/* Hover pulse */}
                      {(isHovered || isSelected) && (
                        <rect x={-RECT_W/2 - 8} y={-RECT_H/2 - 8} width={RECT_W + 16} height={RECT_H + 16}
                          rx={16} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3} className="pulse-ring" />
                      )}
                      {/* Main card */}
                      <rect x={-RECT_W/2} y={-RECT_H/2} width={RECT_W} height={RECT_H} rx={10}
                        fill="var(--bg-secondary)" fillOpacity="0.75"
                        stroke={isSelected ? color : isUnassigned ? color + '33' : color + '66'}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        strokeDasharray={isUnassigned ? '5,3' : 'none'} />
                      {/* Glassmorphism shimmer */}
                      <rect x={-RECT_W/2} y={-RECT_H/2} width={RECT_W} height={RECT_H/2} rx={10}
                        fill={color + '0c'} style={{ pointerEvents: 'none' }} />
                      {/* Left status stripe */}
                      <rect x={-RECT_W/2} y={-RECT_H/2 + 4} width={3} height={RECT_H - 8} rx={2}
                        fill={statusColor} opacity={isUnassigned ? 0.2 : 1} />
                      {/* Icon */}
                      <AssetIconSvg type={node.assetType!} color={color} />
                      {/* Type label */}
                      <text y={-6} textAnchor="middle" fontSize="8" fill={color}
                        fontWeight="700" letterSpacing="0.5" opacity={0.85}
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {node.assetType}
                      </text>
                      {/* Model name */}
                      <text y={RECT_H/2 + 14} textAnchor="middle" fontSize="9" fill="var(--text-primary)"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {node.label.length > 15 ? node.label.slice(0,14)+'…' : node.label}
                      </text>
                      {/* Maintenance badge */}
                      {hasTicket && (
                        <g transform={`translate(${RECT_W/2 - 7},${-RECT_H/2 - 4})`}>
                          <circle r={8} fill="#ff7b72" />
                          <circle r={8} fill="#ff7b72" opacity={0.4} className="badge-pulse" />
                          <text textAnchor="middle" dominantBaseline="central" fontSize="9"
                            fill="white" fontWeight="800" style={{ pointerEvents: 'none' }}>!</text>
                        </g>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </g>

          {/* Vignette overlay */}
          <rect width="100%" height="100%" fill="url(#vignette)" style={{ pointerEvents: 'none' }} />
        </svg>

        {/* ── Detail Panel ── */}
        <div className={`detail-panel ${selectedId ? 'open' : ''}`}>
          <div className="dp-close-row">
            <button className="dp-close-btn" onClick={() => setSelectedId(null)}><X size={15} /></button>
          </div>
          {detailContent ?? (
            <div className="dp-empty-state">
              <div className="dp-empty-icon">⬡</div>
              <div>Select a node to<br />inspect its details</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Legend ── */}
      {legendOpen && (
        <div className="legend-card glass">
          <div className="legend-title">Legend</div>
          <div className="legend-section">Nodes</div>
          <div className="legend-row"><div className="legend-user-dot" />User</div>
          {Object.entries(ASSET_COLORS).slice(0,5).map(([type, color]) => (
            <div key={type} className="legend-row">
              <div className="legend-rect" style={{ background: color + '33', border: `1.5px solid ${color}88` }} />
              {type}
            </div>
          ))}
          <div className="legend-section" style={{ marginTop: 8 }}>Edges</div>
          {Object.entries(EDGE_META).map(([type, meta]) => (
            <div key={type} className="legend-row">
              <svg width="28" height="10">
                <line x1="0" y1="5" x2="28" y2="5"
                  stroke={meta.stroke} strokeWidth={meta.w}
                  strokeDasharray={meta.dash === 'none' ? undefined : meta.dash} />
              </svg>
              {type}
            </div>
          ))}
        </div>
      )}

      <style>{`
        /* Page */
        .graph-page { display:flex;flex-direction:column;height:100vh;overflow:hidden;background:var(--bg-secondary);position:relative; }

        /* Toolbar */
        .graph-toolbar {
          display:flex;align-items:center;gap:10px;padding:0 16px;height:52px;flex-shrink:0;
          background:var(--glass-bg);
          backdrop-filter:blur(16px);
          border-bottom:1px solid rgba(255,255,255,0.08);
          z-index:10;
        }
        .tb-search { display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:0 10px;height:30px;width:180px; }
        .tb-search-icon { color:rgba(255,255,255,0.3);flex-shrink:0; }
        .tb-search-input { background:none;border:none;color:var(--text-primary);font-size:0.78rem;outline:none;width:100%; }
        .tb-search-input::placeholder { color:rgba(255,255,255,0.25); }
        .tb-search-clear { background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;padding:2px;display:flex; }
        .tb-pills { display:flex;gap:2px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:3px; }
        .tb-pill { background:none;border:none;color:rgba(255,255,255,0.4);padding:3px 11px;border-radius:7px;font-size:0.78rem;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:5px;white-space:nowrap; }
        .tb-pill:hover { color:var(--text-primary); }
        .tb-pill.active { background:rgba(88,166,255,0.15);color:#58a6ff;font-weight:600; }
        .tb-badge { background:rgba(88,166,255,0.2);color:#58a6ff;font-size:0.65rem;font-weight:700;padding:1px 5px;border-radius:999px; }
        .tb-dropdowns { display:flex;gap:8px; }
        .tb-dd-wrap { display:flex;align-items:center;gap:5px; }
        .tb-dd-label { font-size:0.72rem;color:rgba(255,255,255,0.3); }
        .tb-dd { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--text-primary);padding:4px 8px;border-radius:7px;font-size:0.78rem;cursor:pointer;outline:none; }
        .tb-actions { display:flex;gap:4px;margin-left:auto; }
        .tb-icon-btn { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.15s; }
        .tb-icon-btn:hover { background:rgba(88,166,255,0.1);color:#58a6ff;border-color:rgba(88,166,255,0.3); }
        .tb-icon-btn.active { background:rgba(88,166,255,0.15);color:#58a6ff;border-color:#58a6ff55; }

        /* Body */
        .graph-body { display:flex;flex:1;overflow:hidden;position:relative; }
        .graph-canvas { flex:1;height:100%;display:block; }

        /* Animations */
        @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.4} 60%{transform:scale(1.18);opacity:0.15} 100%{transform:scale(1.35);opacity:0} }
        .pulse-ring { animation:pulse-ring 2s ease-out infinite; }
        @keyframes badge-pulse-anim { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2.2);opacity:0} }
        .badge-pulse { animation:badge-pulse-anim 1.5s ease-out infinite; }
        @keyframes edge-flow { from{stroke-dashoffset:20} to{stroke-dashoffset:0} }
        .edge-flow { stroke-dasharray:6,4;animation:edge-flow 1.2s linear infinite; }

        /* Detail panel */
        .detail-panel { width:0;min-width:0;overflow:hidden;transition:width 0.28s cubic-bezier(0.4,0,0.2,1),min-width 0.28s cubic-bezier(0.4,0,0.2,1);background:var(--bg-secondary);backdrop-filter:blur(20px);border-left:1px solid rgba(255,255,255,0.07);flex-direction:column;display:flex; }
        .detail-panel.open { width:360px;min-width:360px;overflow-y:auto; }
        .dp-close-row { display:flex;justify-content:flex-end;padding:12px 14px 0; }
        .dp-close-btn { background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer; }
        .dp-hero { padding:20px 20px 16px;display:flex;flex-direction:column;align-items:center;gap:6px;border-bottom:1px solid rgba(255,255,255,0.06); }
        .dp-avatar { width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:800;margin-bottom:4px; }
        .user-avatar { background:rgba(88,166,255,0.15);color:#58a6ff;border:2px solid rgba(88,166,255,0.35); }
        .asset-avatar { border-radius:14px;border:2px solid rgba(255,255,255,0.1); }
        .dp-name { font-size:1rem;font-weight:700;text-align:center;color:var(--text-primary); }
        .dp-sub  { font-size:0.78rem;color:rgba(255,255,255,0.35); }
        .dp-tag  { font-size:0.7rem;font-family:monospace;background:rgba(88,166,255,0.1);color:#58a6ff;padding:2px 10px;border-radius:999px; }
        .dp-mini-stats { display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;width:100%;margin-top:8px; }
        .dp-stat { display:flex;flex-direction:column;align-items:center;gap:2px;background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 4px; }
        .dp-stat b { font-size:0.9rem;font-weight:700;color:var(--text-primary); }
        .dp-stat span { font-size:0.65rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.5px; }
        .dp-body { padding:16px;display:flex;flex-direction:column;gap:12px; }
        .dp-section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.3);font-weight:700; }
        .dp-kv-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;background:rgba(0,0,0,0.25);padding:12px;border-radius:10px; }
        .dp-kv { display:flex;flex-direction:column;gap:2px; }
        .dp-kv span { font-size:0.62rem;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,0.3); }
        .dp-kv b { font-size:0.8rem;font-weight:600;color:var(--text-primary);word-break:break-word; }
        .dp-asset-card { display:flex;align-items:center;gap:0;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.07); }
        .dp-asset-color-bar { width:3px;align-self:stretch;flex-shrink:0; }
        .dp-asset-info { flex:1;padding:8px 10px;display:flex;flex-direction:column;gap:2px; }
        .dp-asset-name { font-size:0.82rem;font-weight:600;color:var(--text-primary); }
        .dp-asset-type { font-size:0.68rem;color:rgba(255,255,255,0.35); }
        .dp-status-dot { font-size:0.68rem;font-weight:700;padding-right:10px; }
        .dp-ticket-card { background:rgba(255,123,114,0.08);border:1px solid rgba(255,123,114,0.2);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:4px; }
        .dp-ticket-header { display:flex;justify-content:space-between;align-items:center; }
        .dp-ticket-pri { font-size:0.68rem;font-weight:800;letter-spacing:0.5px; }
        .dp-ticket-age { font-size:0.65rem;color:rgba(255,255,255,0.3); }
        .dp-ticket-issue { font-size:0.8rem;color:var(--text-primary); }
        .dp-timeline { display:flex;flex-direction:column;gap:0; }
        .dp-timeline-item { display:flex;gap:10px;align-items:flex-start; }
        .dp-tl-line { display:flex;flex-direction:column;align-items:center;flex-shrink:0;padding-top:3px; }
        .dp-tl-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
        .dp-tl-connector { width:1px;flex:1;min-height:18px;background:rgba(255,255,255,0.08);margin:2px 0; }
        .dp-tl-content { display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;padding-bottom:12px; }
        .dp-tl-type { font-size:0.72rem;font-weight:700; }
        .dp-tl-user { font-size:0.72rem;color:rgba(255,255,255,0.4); }
        .dp-tl-time { font-size:0.65rem;color:rgba(255,255,255,0.25);margin-left:auto; }
        .dp-inventory-btn { display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;background:rgba(88,166,255,0.1);border:1px solid rgba(88,166,255,0.25);border-radius:9px;color:#58a6ff;font-size:0.82rem;font-weight:600;text-decoration:none;transition:background 0.15s; }
        .dp-inventory-btn:hover { background:rgba(88,166,255,0.18); }
        .dp-empty-state { display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:200px;color:rgba(255,255,255,0.2);font-size:0.85rem;text-align:center;line-height:1.6; }
        .dp-empty-icon { font-size:2rem;opacity:0.3; }

        /* Legend */
        .legend-card { position:absolute;bottom:20px;left:20px;z-index:20;background:var(--glass-bg);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:12px 14px;min-width:130px; }
        .legend-title { font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.35);margin-bottom:8px; }
        .legend-section { font-size:0.65rem;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.25);margin:4px 0 4px; }
        .legend-row { display:flex;align-items:center;gap:7px;font-size:0.74rem;color:rgba(255,255,255,0.55);padding:2px 0; }
        .legend-user-dot { width:10px;height:10px;border-radius:50%;background:rgba(88,166,255,0.25);border:1.5px solid #58a6ff88;flex-shrink:0; }
        .legend-rect { width:14px;height:9px;border-radius:3px;flex-shrink:0; }
      `}</style>
    </div>
  );
}
