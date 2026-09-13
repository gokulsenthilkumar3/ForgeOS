# VaultIQ UI Showcase

VaultIQ is an enterprise-grade asset management system with a premium, high-fidelity user interface. Below is a showcase of the current implementation.

## 📊 Operational Dashboard
The dashboard provides real-time insights into inventory health, asset distribution, and recent operational activities.

![Dashboard Overview](file:///C:/Users/gokul/.gemini/antigravity/brain/b358c04f-c5ce-413e-8714-35ab511f5e13/dashboard_overview_1778336533098.png)

## 🌐 Digital Twin Registry
The inventory system uses 3D Digital Twins to represent physical assets. Each twin reflects the live status and condition of the hardware.

![Digital Twin Registry](file:///C:/Users/gokul/.gemini/antigravity/brain/b358c04f-c5ce-413e-8714-35ab511f5e13/inventory_3d_digital_twins_1778336650354.png)

## 🎬 Interface Walkthrough
Watch the live interaction with the VaultIQ interface.

![Walkthrough Recording](file:///C:/Users/gokul/.gemini/antigravity/brain/b358c04f-c5ce-413e-8714-35ab511f5e13/view_inventory_1778336551923.webp)

---

### 🔧 Recent Fixes
To ensure the UI runs smoothly in a development environment, the following adjustments were made:
- **Server Component Compatibility**: Fixed an error in `layout.tsx` where `styled-jsx` was being used in a Server Component. Moved layout styles to `globals.css`.
- **Client Directives**: Added `"use client";` to page modules that utilize interactive components and `styled-jsx`.
