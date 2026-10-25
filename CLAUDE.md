# CLAUDE.md

Contexto do projeto para o Claude Code.

## Visão geral

**Armaz3D / Estoque 3D**: app desktop de gestão de estoque com visualização 3D interativa do galpão (estantes, nichos, caixas/paletes).
Stack: Electron 33 · Vite 5 · React 18 · TypeScript (strict) · React Three Fiber 8 + drei 9 · three 0.169 · GSAP 3 · Zustand 4 · Tailwind 3 · lucide-react.
A interface e os textos do usuário são em **português (pt-BR)**; identificadores no código são em inglês.

## Comandos

```bash
npm run dev        # Vite (127.0.0.1:5173, strictPort) + Electron via concurrently/wait-on
npm run dev:web    # só o Vite, no navegador
npm run typecheck  # tsc --noEmit (único "lint" do projeto)
npm run build      # typecheck + vite build → dist/
npm start          # Electron carregando dist/index.html
npm run dist       # electron-builder --win → release/
```

Não há suíte de testes. Valide alterações com `npm run build`.
npm ≥ 11 bloqueia install scripts: `electron` e `esbuild` estão liberados em `allowScripts` no `package.json`. Se atualizar a versão deles, rode `npm install-scripts approve electron esbuild`.

## Arquitetura

- `electron/main.cjs`: processo principal em CommonJS (o pacote é `"type": "module"`). `contextIsolation`, `sandbox`, sem `nodeIntegration` e sem preload. Em dev usa `VITE_DEV_SERVER_URL`; senão carrega `dist/index.html` (por isso `base: './'` no Vite).
- `src/store/useStockStore.ts`: **fonte única da verdade**. Zustand + `persist` (localStorage, chave `estoque-3d`). Persiste `racks`, `items` e `viewMode`; o `merge` finaliza animações interrompidas (`entering` → `idle`, `leaving` → removido).
- `src/lib/warehouseLayout.ts`: dimensões da cena, conversão endereço → coordenada (`slotWorldPosition`), formatação de endereço e regras de cor (`getStatus`, `heatmapColor`). Toda geometria e cor deve vir daqui, sem números mágicos nos componentes.
- `src/data/seed.ts`: galpão de demonstração (3 ruas × 2 estantes × 4 níveis × 4 posições) e produtos de exemplo.
- `src/components/three/`: `WarehouseScene` (Canvas, luzes, piso, OrbitControls, `CameraFocus`), `Rack3D` (estrutura + marcadores de nicho), `RackItem3D` (caixa animada), `ReceivingDock`.
- `src/components/ui/`: `DashboardUI` compõe o overlay. A raiz é `pointer-events-none z-10` e cada painel reativa com `pointer-events-auto` (o `Panel` já faz isso). Layout: `Sidebar` (recolhível, Ctrl+B) | `TopBar` + coluna da aba ativa (`tabs/DashboardTab`, `InboundTab`, `OutboundTab`, `AuditTab`, `UsersTab`, mapeadas em `TAB_CONTENT`; abas com tabela entram em `WIDE_TABS`) | `ItemDetailsPanel` + `Legend`. Para criar uma aba: adicione o id em `AppTab`, uma entrada em `TABS` (`Sidebar.tsx`), o componente em `TAB_CONTENT` e, se restrita, a permissão em `TAB_PERMISSIONS`.
- Estrutura do galpão: `aisles` (ruas, em ordem: primeira = fundo, última = junto à doca) + `racks` no store, persist `version: 2` (`migrate` converte o formato v1). `Rack.position` e `Rack.aisle` (código) são **derivados** por `buildLayout` (grade automática em `warehouseLayout.ts`); nunca edite à mão. Ids de estante são internos e estáveis, então renomear o código da rua não quebra `location.rackId`.
- Aba Armazém (`tabs/LayoutTab`, permissão `layout:manage`): edita `layoutDraft` via `editLayout(recipe)` com as operações puras de `src/lib/layoutEditor.ts`; a cena mostra o rascunho (`useWarehouseLayout`). `applyLayout` valida com `validateLayout` (nenhum item pode ficar sem nicho); trocar de aba descarta o rascunho. Rua `blocked` não recebe entradas (`addItem`/`findFreeSlot`), mas permite saídas.
- `src/hooks/useStockStats.ts`: KPIs derivados (ocupação, unidades, contagem por status, alertas). Reutilize em vez de recalcular nos componentes.
- Histórico: `movements` no store (mais recente primeiro, limitado a 5000). `addItem` (receipt), `adjustQuantity` (restock/withdrawal) e `removeItem` (removal) registram automaticamente. Toda mudança de quantidade deve passar por essas ações para entrar no histórico; `updateItem` não registra.
- `activeTab` e `sidebarCollapsed` são persistidos; `setActiveTab` desliga o `placementMode`.
- Usuários: `users` fica no store (persistido); a sessão (`currentUserId`) **não** é persistida, então o app sempre abre no `LoginScreen`. Senhas em PBKDF2-SHA256 via Web Crypto (`src/lib/auth.ts`). Admin inicial `admin`/`admin` em `createSeedUsers` (hash pré-calculado), com troca de senha obrigatória (`mustChangePassword` abre o `ChangePasswordDialog`).
- Perfis e permissões em `ROLE_META` (`admin`, `operator`, `viewer`); abas restritas em `TAB_PERMISSIONS`. As ações do store conferem a permissão (`actor(...)`), não só a UI. Na UI use `usePermission`, `useCurrentUser` e `useActiveTab` (`src/hooks/useAuth.ts`). Usuários com movimentações não podem ser excluídos, só desativados; sempre resta ao menos um admin ativo.
- Cada `Movement` guarda `userId`/`userName` (snapshot). A aba Registros (`AuditTab`) filtra e exporta CSV (`;`, BOM, para Excel pt-BR) e JSON via `src/lib/exportLog.ts`; sem `audit:all` o usuário vê só as próprias movimentações. O histórico é limitado a 5000 registros.

## Conceitos de domínio

- Endereço de nicho: `SlotAddress { rackId, level, slot }`, com `level` e `slot` **base 0**; na UI são exibidos base 1 (`A-02-3-1`, "Rua A · Estante 02 · Nível 3 · Posição 1").
- Status: `critical` se `quantity <= 0` ou `<= minQuantity/2`; `low` se `<= minQuantity`; senão `ok`.
- Heatmap: ocupação do nicho = `quantity / capacity`.

## Ciclo de animação (importante)

Cada `StockItem` tem `phase: 'entering' | 'idle' | 'leaving'`. O store muda a fase e o componente 3D executa a animação e devolve o controle:

1. `addItem()` cria o item em `entering`. `RackItem3D` anima doca → corredor central (`TRANSIT_LANE_X`) → frente do nicho → nível → encaixe, e ao final chama `markIdle(id)`.
2. `removeItem()` marca `leaving`. `RackItem3D` anima a saída (eleva, encolhe, fade) e ao final chama `finalizeRemoval(id)`, que apaga o item de fato.

Regras ao mexer nisso:
- Nunca remova um item diretamente do array: use `removeItem` para manter a animação.
- Itens em `leaving` não contam como ocupando o nicho (`isSlotFree`) e não são interativos.
- Timelines GSAP são criadas em `useLayoutEffect` e **mortas no cleanup** (`tl.kill()`); não use `gsap.context().revert()` em objetos three. O app roda em `StrictMode`, então os efeitos executam duas vezes em dev.
- A cor do material é definida só na montagem (`initialColor`); mudanças posteriores são interpoladas via `gsap.to(material.color, …)`. Não passe a cor reativa como prop do material, senão o tween é sobrescrito.

## Idioma (padrão do repositório)

- **Em inglês:** mensagens de commit, `README.md`, descrição/tópicos do GitHub, títulos e descrições de PR/issues.
- Commits seguem Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`…).
- Os textos da interface do app continuam em **português (pt-BR)**.

## Convenções

- Selecione estado do Zustand com seletores granulares (`useStockStore((s) => s.x)`). Seletores que criam arrays/objetos novos precisam de `useMemo` ou `useShallow`.
- Leituras pontuais dentro de handlers e efeitos: `useStockStore.getState()`.
- Rótulos 3D usam `<Html>` do drei com `zIndexRange={[5, 0]}` para ficarem abaixo do overlay. Não use `<Text>` do drei: ele baixa fonte de CDN, e o app é desktop/offline.
- A CSP fica em `index.html`. Libere ali qualquer origem nova; workers `blob:` já são permitidos.
- Estilo: Tailwind com paleta slate/cyan, painéis translúcidos (`Panel`, `inputClass`, `labelClass`).
