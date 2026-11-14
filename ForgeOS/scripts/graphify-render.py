"""Render the extracted ForgeOS graph with Graphify's installed Python environment.

This script uses the AST and semantic sidecars created by the Graphify skill.
For subsequent structural refreshes use pnpm graphify from the repository root.
"""
import json
from pathlib import Path
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html
from graphify.detect import save_manifest
from graphify.cache import save_semantic_cache
from graphify.diagnostics import diagnose_extraction, format_diagnostic_report

root = Path(__file__).resolve().parents[1]
out = root / 'graphify-out'
ast = json.loads((out / '.graphify_ast.json').read_text(encoding='utf-8-sig'))
sem = json.loads((out / '.graphify_semantic.json').read_text(encoding='utf-8-sig'))
detect = json.loads((out / '.graphify_detect.json').read_text(encoding='utf-8-sig'))
for source, read_lines in sem.get('coverage', {}).items():
    total = len(Path(source).read_text(encoding='utf-8-sig').splitlines())
    if read_lines < total:
        raise RuntimeError(f'Semantic coverage mismatch: {source}: read {read_lines}, actual {total}')
extraction = {'nodes': ast['nodes'] + sem['nodes'], 'edges': ast['edges'] + sem['edges'], 'hyperedges': sem.get('hyperedges', [])}
(out / '.graphify_extract.json').write_text(json.dumps(extraction), encoding='utf-8')
G = build_from_json(extraction, root=str(root), directed=True)
if not G.number_of_nodes():
    raise RuntimeError('Extraction produced an empty graph')
communities = cluster(G)
cohesion = score_all(G, communities)
labels = {}
for cid, members in communities.items():
    top = sorted(members, key=lambda n: G.degree(n), reverse=True)[:1]
    labels[cid] = str(G.nodes[top[0]].get('label', 'Application')) + ' connections'
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
questions = suggest_questions(G, communities, labels)
if not to_json(G, communities, str(out / 'graph.json'), community_labels=labels):
    raise RuntimeError('Graphify shrink guard refused overwrite')
report = generate(G, communities, cohesion, labels, gods, surprises, detect, {'input': 0, 'output': 0}, str(root), suggested_questions=questions)
report = report.replace('- Token cost: 0 input · 0 output', '- Token cost: AST 0; semantic agent usage unavailable (not measured)')
report += '\n\n## Coverage and cost limitations\n\nAST extraction uses no model tokens. Semantic agent token counts were not exposed by the host, so total model token cost is unknown; any generated zero counter is not a measured semantic cost. SQL schema extraction was skipped because tree_sitter_sql is not installed. Decorative icon excluded. Eight code files produced no symbols; the graph is not proof of full workflow coverage.\n'
report += '\nGraph outputs are written into the working tree. Local caches/intermediates are ignored; graph.json, graph.html and this report remain reviewable artifacts.\n'
(out / 'GRAPH_REPORT.md').write_text(report, encoding='utf-8')
(out / '.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}), encoding='utf-8')
if not to_html(G, communities, str(out / 'graph.html'), community_labels=labels):
    raise RuntimeError('Graphify HTML export failed')
spec = Path.home() / '.codex/skills/graphify/references/extraction-spec.md'
save_semantic_cache(sem['nodes'], sem['edges'], sem.get('hyperedges', []), root=str(root), allowed_source_files=detect['files']['document'], prompt_file=str(spec))
save_manifest(detect['files'], root=str(root))
(out / '.graphify_root').write_text(str(root), encoding='utf-8')
import sys
(out / '.graphify_python').write_text(sys.executable, encoding='utf-8')
(out / 'cost.json').write_text(json.dumps({'ast_model_tokens': 0, 'semantic_input_tokens': None, 'semantic_output_tokens': None, 'reason': 'Host does not expose semantic subagent token usage'}, indent=2), encoding='utf-8')
diagnostics = diagnose_extraction(extraction, directed=True, root=str(root))
text = format_diagnostic_report(diagnostics)
with (out / 'GRAPH_REPORT.md').open('a', encoding='utf-8') as report_file:
    report_file.write('\n## Graph integrity limitations\n\n' + text + '\nThe graph is navigational evidence, not a complete dependency or security certification.\n')
print(text)
print(f'Graph complete: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities')
