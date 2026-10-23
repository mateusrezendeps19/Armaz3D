# Estoque 3D

Aplicativo desktop (Electron + React + TypeScript) para gestão de estoque com visualização 3D interativa do galpão (React Three Fiber + drei), animações GSAP e estado global em Zustand.

## Rodando

```bash
npm install
npm run dev        # Vite + janela Electron com hot reload
npm run dev:web    # somente no navegador (http://127.0.0.1:5173)
npm run build      # typecheck + build de produção em dist/
npm start          # abre o build de produção no Electron
npm run dist       # gera o instalador Windows (release/)
```

> npm ≥ 11 bloqueia scripts de instalação: `electron` e `esbuild` já estão liberados em `allowScripts` no `package.json`.

## Estrutura

```
electron/main.cjs                     Processo principal (janela, segurança)
src/
  types/stock.ts                      Tipos do domínio (Rack, StockItem, SlotAddress…)
  lib/warehouseLayout.ts              Dimensões, endereço → coordenada 3D, cores de status/heatmap
  data/seed.ts                        Galpão de demonstração (3 ruas × 2 estantes × 4 níveis × 4 posições)
  store/useStockStore.ts              Zustand: itens, CRUD, seleção, modo de visualização (persistido)
  components/three/
    WarehouseScene.tsx                Canvas, luzes com sombra, piso + grid, OrbitControls, foco de câmera
    Rack3D.tsx                        Estante porta-paletes + nichos clicáveis no modo de posicionamento
    RackItem3D.tsx                    Caixa: cor dinâmica, hover/click com brilho e contorno, animações
    ReceivingDock.tsx                 Doca de recebimento e corredor central de transporte
  components/ui/
    DashboardUI.tsx                   Overlay 2D (compõe os painéis abaixo)
    TopBar / AddItemForm / InventoryList / ItemDetailsPanel / Legend
```

## Como funciona

- **Endereçamento:** cada nicho é `{ rackId, level, slot }` → exibido como `Rua A · Estante 02 · Nível 3 · Posição 1` (código `A-02-3-1`). `slotWorldPosition()` converte o endereço para coordenadas da cena.
- **Status:** verde = disponível, amarelo = `quantidade ≤ mínimo`, vermelho = `quantidade ≤ mínimo/2` ou zerado.
- **Heatmap:** cor pela ocupação do nicho (`quantidade / capacidade`), com transição gradual de cor via GSAP.
- **Entrada:** `addItem()` cria o item na fase `entering`; a caixa surge na doca, percorre o corredor central, desliza até a frente do nicho, sobe e encaixa. Ao final, `markIdle()`.
- **Saída:** `removeItem()` marca `leaving`; a caixa sai da prateleira, eleva-se, encolhe e some. Ao final, `finalizeRemoval()` apaga o registro.
- **Persistência:** o estoque fica salvo no `localStorage` da janela; o botão ↺ restaura os dados de demonstração.
