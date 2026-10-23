# Armaz3D

**Desktop inventory management with an interactive 3D warehouse.**

Armaz3D renders your warehouse in real time: aisles, racks, shelf levels and the boxes/pallets in each slot. Stock levels show up as colours, and goods animate in and out as you receive and ship them. It is built with Electron, React, TypeScript and React Three Fiber.

> The app's interface is in Brazilian Portuguese (pt-BR).

## Features

- **3D warehouse scene**: industrial floor grid, pallet racks with addressable slots, a receiving dock, realistic lighting with shadows, and an orbit camera with zoom and angle limits.
- **Status colours**: green = available, yellow = low stock, red = critical/empty.
- **Occupancy heatmap**: switch to a heatmap where each box gradually shifts from cold to hot according to how full its slot is.
- **Hover and click (raycasting)**: hovering or clicking a box makes it glow and shows an outline, and opens a details panel (SKU, name, quantity, address). The camera glides to the selected item.
- **Animated stock movements (GSAP)**:
  - *Inbound*: the box spawns at the receiving dock, travels down the central lane, slides to its rack, lifts to its level and slots in.
  - *Outbound*: the box pulls out, rises, shrinks and fades away.
- **Collapsible sidebar** (`Ctrl+B`) with three workspaces:
  - *Dashboard*: KPIs (pallets, units, slot occupancy, alerts), a status breakdown, a restock alert list and a searchable inventory synced with the 3D highlight.
  - *Inbound (Entradas)*: a receiving form (automatic slot, manual address, or click an empty slot in 3D) and the inbound history.
  - *Outbound (Saídas)*: partial withdrawals or full pallet removal for the selected item, and the outbound history.
- **Movement history**: every receipt, restock, withdrawal and removal is logged with quantity, address and timestamp.
- **Persistence**: stock is saved locally between sessions, and one click restores the demo data.

## Tech stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Electron 33 |
| UI | React 18 + TypeScript (strict), Vite 5 |
| 3D | three.js 0.169, @react-three/fiber 8, @react-three/drei 9 |
| Animation | GSAP 3 |
| State | Zustand 4 (with `persist`) |
| Styling | Tailwind CSS 3, lucide-react icons |

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev        # Vite dev server + Electron window with hot reload
```

| Script | Description |
| --- | --- |
| `npm run dev` | Run the desktop app in development mode |
| `npm run dev:web` | Run in the browser only (http://127.0.0.1:5173) |
| `npm run typecheck` | TypeScript type check |
| `npm run build` | Type check and production build to `dist/` |
| `npm start` | Open the production build in Electron |
| `npm run dist` | Build the Windows installer to `release/` |

> npm 11+ blocks install scripts by default. `electron` and `esbuild` are already allowed through `allowScripts` in `package.json`.

## Project structure

```
electron/main.cjs                 Electron main process (window, security settings)
src/
  types/stock.ts                  Domain types (Rack, StockItem, SlotAddress, ...)
  lib/warehouseLayout.ts          Scene dimensions, slot address to 3D position, status/heatmap colours
  data/seed.ts                    Demo warehouse: 3 aisles x 2 racks x 4 levels x 4 slots (96 slots)
  store/useStockStore.ts          Zustand store: items, CRUD, movement log, navigation, view mode (persisted)
  hooks/useStockStats.ts          Derived KPIs shared by the sidebar, top bar and dashboard
  components/three/
    WarehouseScene.tsx            Canvas, lights, floor, OrbitControls, camera focus
    Rack3D.tsx                    Pallet rack and clickable slot markers
    RackItem3D.tsx                Box: dynamic colour, hover/click glow, GSAP animations
    ReceivingDock.tsx             Receiving dock and central transit lane
  components/ui/
    DashboardUI.tsx               2D overlay: sidebar + top bar + active tab + details panel
    Sidebar.tsx                   Collapsible navigation (Dashboard / Entradas / Saídas)
    tabs/                         DashboardTab, InboundTab, OutboundTab
    TopBar, AddItemForm, InventoryList, MovementList, ItemDetailsPanel, Legend
```

## How it works

- **Addressing**: each slot is `{ rackId, level, slot }`, displayed as *Rua A · Estante 02 · Nível 3 · Posição 1* (code `A-02-3-1`). `slotWorldPosition()` maps an address to scene coordinates.
- **Status rules**: *low* when `quantity <= minQuantity`. *Critical* when `quantity <= minQuantity / 2` or the slot is empty.
- **Heatmap**: slot occupancy is `quantity / capacity`, and colour changes are tweened with GSAP.
- **Animation lifecycle**: every item has a `phase` (`entering` → `idle` → `leaving`). The store changes the phase, and `RackItem3D` plays the animation and reports back:
  - an inbound animation ends with `markIdle()`;
  - an outbound animation ends with `finalizeRemoval()`, which actually deletes the record.

## License

No license specified yet.
