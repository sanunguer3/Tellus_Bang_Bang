# Tellus Bang Bang

Jogo de arena por times: monte um esquadrão de até 3 campeões, escolha quantos
times entram na arena e enfrente a IA. A arena se fecha com o tempo, tem temas
com perigos próprios, caixas de bônus e três modos de jogo. Os campeões podem
ser criados no editor e compartilhados na nuvem.

## Como abrir

Abra o `index.html` diretamente no navegador (duplo clique). O jogo funciona
sem servidor e sem instalar nada.

> Dica: se preferir servir por HTTP, rode `npx serve .` ou
> `python -m http.server` na pasta do projeto.

O arquivo `Tellus Bang Bang.html` na raiz é a versão antiga (um único arquivo).
A versão atual é o `index.html`; o original também está preservado em
`backup/Tellus Bang Bang (original).html`.

## Estrutura

```
index.html                 Página e ordem dos scripts
css/style.css              Estilos, temas claro/escuro/automático
js/core.js                 Utilidades, armazenamento, toasts, modal
js/data.js                 Constantes, tipos, campeões padrão, balanceamento
js/sanitize.js             Validação e normalização de campeões
js/state.js                Elenco, seleção, telas, tema e merge da nuvem
js/champions.js            Lista de campeões e detalhes
js/menu.js                 Sala de batalha (modo, dificuldade, arena e times)
js/editor.js               Editor de campeões (salvar, publicar, excluir)
js/battle.js               Motor de batalha, modos, IA, caixas e perigos
js/render.js               Canvas, arenas temáticas, sprites e avisos
js/hud.js                  HUD da batalha, prep e cartões de inimigos
js/tips.js                 Dicas e ajuda
js/input.js                Teclado, toque e botões
js/main.js                 Inicialização
js/cloud.js                Firebase (compat): login anônimo e Firestore
firestore.rules            Regras de segurança do Firestore
firebase.json              Configuração de deploy das regras
backup/                    Versão original em arquivo único
```

Todos os scripts são **clássicos** (IIFEs em `window.TBB`), sem módulos ES,
para que o jogo funcione ao abrir o arquivo direto (`file://`).

## Nuvem (compartilhar campeões)

A nuvem usa Firebase (Firestore + Authentication) com os SDKs *compat*, que
funcionam em `file://`.

- **Leitura** dos campeões publicados é pública.
- **Publicar/editar/excluir** exige login anônimo e só o criador do campeão
  pode alterá-lo.
- O elenco inteiro fica salvo no `localStorage` (`tbb_ro4`), então o jogo
  continua funcionando offline. Campeões da nuvem são mesclados por `id`/nome.

### Banco de campeões e elenco vazio

A partir desta versão o jogo **não começa com os campeões prontos no elenco**.
Eles ficam no **Banco**, um catálogo disponível para importação manual.

- Na **Sala de batalha** (elenco vazio) ou no **editor de campeões**, use
  **📥 Importar do banco** para trazer os campeões prontos para o seu elenco.
- Só dá para entrar numa batalha com pelo menos um campeão no elenco.
- A migração de `tbb_ro3` limpa os 9 campeões iniciais do elenco e preserva os
  campeões criados ou publicados por você. A chave antiga `tbb_ro2` também
  recebe o novo conjunto de 3 habilidades e as personalidades novas.

### Ativar o login anônimo

Enquanto o login anônimo estiver desativado, o jogo mostra
`nuvem só leitura` e os campeões ficam salvos apenas neste navegador.

1. Abra o [Console do Firebase](https://console.firebase.google.com/) do
   projeto `tellus-bang-bang`.
2. Vá em **Authentication → Sign-in method**.
3. Ative **Anonymous** (Anônimo) e salve.
4. Recarregue o jogo.

### Publicar as regras do Firestore

No Console: **Firestore Database → Rules**, cole o conteúdo de
`firestore.rules` e publique.

Ou, com a CLI do Firebase instalada:

```bash
firebase login
firebase deploy --only firestore:rules
```

As regras permitem leitura pública de `/campeoes`, escrita apenas pelo dono
(`dono == request.auth.uid`) e limitam o documento a ~100 KB.

## Como jogar

- Na **Sala de batalha**, escolha o **modo**, a **dificuldade da IA** e a
  **arena** (ou `Aleatória`). Depois toque nos campeões para montar seu time
  (até 3) e escolha de 2 a 4 times na arena.
- **Posicionamento (15s):** a luta começa num preparo de 15 segundos. Arraste
  seus campeões pelo canvas para reposicioná-los; o botão **▶ Iniciar agora**
  pula o tempo restante. Se o tempo acabar, a luta começa sozinha.
- Durante a luta, os comandos valem para o líder (★). Troque de líder com
  `A`/`D`, `1`–`3` ou tocando nele.
- Comandos: `J` defender, `K` recuar, `L` livre, `U` atacar, `I` finalizar,
  `O` focar. Toque em um inimigo para focá-lo.
- **Uma ordem por vez:** enquanto a ordem atual durar, os outros comandos
  ficam bloqueados. **Livre** é a exceção: cancela a ordem ativa. Depois de
  qualquer tentativa há uma pausa curta de 0,8s antes da próxima.
- Duração das ordens: Defender 5s, Recuar 3,5s, Atacar 4s, Finalizar 3s,
  Focar 8s. A obediência do campeão define a chance de ele aceitar a ordem.
  **Atacar** foca o alvo atual (ou o inimigo mais próximo) e faz o campeão
  avançar mais rápido.
- **Avisos na arena:** dano, cura, buffs, debuffs, esquiva, empurrão e quedas
  aparecem como avisos curtos acima dos campeões, para não precisar ler o log.
- O painel **📜 Registro** mostra em detalhe habilidades, curas, ordens, quedas
  e avisos. Ele começa oculto; use o botão **📜 Registro** na barra de comandos
  para mostrar ou ocultar.
- Os cartões de inimigos no topo são compactos: toque em um deles para
  **focar** aquele alvo.
- Toque na etiqueta (`tank`, `dps`, `suporte`) de um campeão para trocá-la.

## Modos de jogo

| Modo | Como funciona |
| --- | --- |
| ⚔️ **Clássico** | Uma batalha. Vence quem sobrar; a arena fecha com o tempo. |
| ♾️ **Infinito** | Ao vencer, você escolhe entre encerrar, recomeçar, trocar de time ou ir para a próxima rodada. Cada rodada deixa os inimigos mais fortes. O resumo mostra rodada e vitórias. |
| 🧟 **Sobrevivência** | A luta não termina: quando os inimigos caem, novas ondas surgem. A arena se reabre quando um reforço entra. Vale até o seu time cair; o resumo mostra a onda alcançada. |

## Dificuldade da IA

A IA sempre usa a **mesma quantidade de campeões que você**. A dificuldade
ajusta vida, ataque, crítico, esquiva, tempo de reação, precisão das decisões e
a frequência com que ela usa ordens táticas.

| Nível | Ajustes principais |
| --- | --- |
| 🌱 **Fácil** | Vida/ataque −15%, reação lenta, decisões imprecisas, quase não usa ordens. |
| ⚖️ **Normal** | Valores padrão, reação e decisões medianas. |
| 🔥 **Difícil** | Vida/ataque +8%, +4% de crítico, +2% de esquiva, reage rápido e usa ordens com frequência. |
| 💀 **Brutal** | Vida/ataque +16%, crítico e esquiva altos, reação muito rápida e decisões quase sempre boas. |

## Arenas

A arena é escolhida na sala de batalha (ou sorteada). O raio cresce com o
número de campeões em campo, contando todos os times — **210 + 18 por
campeão**, entre 240 e 380 — para caber lutas maiores. O muro começa a fechar
aos 20s e o colapso causa dano em todos.

| Arena | Perigo |
| --- | --- |
| 🟫 Terra Antiga | Nenhum. |
| 🔥 Forja Ardente | Chamas que queimam quem pisa. |
| ❄️ Geleira Eterna | Gelo que deixa lentidão. |
| ⚡ Campo de Raios | Raios que paralisam. |
| 🌬️ Pico dos Ventos | Rajadas que empurram. |
| 🌵 Fosso de Espinhos | Espinhos que causam dano imediato. |

## Caixas de bônus

Caixas aparecem sozinhas de tempos em tempos e também quando alguém acerta um
**crítico** (a caixa surge perto de quem critou). Elas duram alguns segundos e
qualquer campeão pode pegar — inclusive os inimigos.

| Caixa | Efeito |
| --- | --- |
| 💚 Cura | Recupera 22% da vida. |
| 🛡️ Escudo | Absorve dano por 8s. |
| 😤 Fúria | +20% de dano por 8s. |
| ✨ Bênção | +30% de ataque e velocidade por 8s. |
| 🍀 Sorte | +8% de crítico até o fim da luta. |

Campeões **mesquinhos** são atraídos pelas caixas: enxergam caixas de longe e
ganham bônus nos efeitos que elas dão.

## Combate

Cada campeão tem **no mínimo 200 de vida** e ataque base 12 (mais os pontos de
atributo). A batalha combina vantagens de tipo/função, personalidades,
habilidades em três níveis e efeitos contínuos.

O combate é ágil, mas não é uma perseguição direta: os campeões **vagueiam** em
direções curtas e aleatórias e só se aproximam de verdade em surtos, quase
sempre quando estão com um ataque pronto. Cada habilidade tem uma
**preparação (windup) de ~0,42s** antes de acertar — dá tempo de ver quem vai
atacar e reagir com uma ordem. Habilidades com empurrão **deslocam o alvo de
verdade**, com impulso que decai em poucos décimos de segundo.

### Três habilidades por campeão

| Nível | Papel | Multiplicador | Recarga |
| --- | --- | --- | --- |
| ◆ Normal | habilidade básica | até 2,2× | 4–10s |
| ◆◆ Média | mais forte ou com mais efeitos | até 2,8× | 6–14s |
| ★ Ultimate | golpe decisivo | até 4× | 10–22s |

As habilidades são usadas automaticamente quando ficam prontas. A IA escolhe a
melhor opção para a situação: cura quando um aliado está ferido, aplica efeitos
que o alvo ainda não tem, guarda a Ultimate para alvos saudáveis e evita
gastar golpes fortes em quem já vai cair.

### Personalidades

- 🦁 **Corajosa** — nunca recua e luta até o fim.
- 🐢 **Medrosa** — recua abaixo de 35% de vida; ataca mais devagar, mas corre mais.
- 😈 **Sádica** — persegue o inimigo com menos vida, causa +20% em alvos feridos
  e recua abaixo de 25% de vida.
- 😖 **Masoquista** — recebe 15% menos dano e ganha fúria (+20% de ataque) ao
  ser atingida. Nunca recua.
- 🔥 **Furiosa** — quanto menos vida, mais dano causa (até +35%).
- 🧐 **Cautelosa** — mantém distância, recebe 8% menos dano e recua abaixo de 30%.
- 🫶 **Leal** — fica perto dos aliados feridos, cura 20% a mais e não abandona o time.
- ⚡ **Impulsiva** — ataca 25% mais rápido, mas recebe +10% de dano.
- 👑 **Orgulhosa** — causa +10% de dano, mas desobedece mais.
- 🧠 **Estrategista** — escolhe melhor os alvos e tem +8% de crítico.
- 🤑 **Mesquinha** — é atraída por caixas de bônus, enxerga caixas de longe e
  ganha +25% nos efeitos delas. Move-se um pouco mais rápido.
- 🗡️ **Vingativa** — guarda quem a feriu e passa a atacar essa unidade com
  prioridade e dano extra.
- 🩸 **Sanguinária** — rouba vida a cada acerto, persegue alvos feridos e causa
  mais dano em quem já está machucado.
- 🪨 **Teimosa** — resiste a controle (paralisia/lentidão) e obedece melhor,
  recebendo um pouco menos de dano.
- 🍀 **Sortuda** — tem esquiva e crítico extras e ganha mais com caixas.
- 🛡️ **Protetora** — reduz o dano recebido pelos aliados próximos e prioriza
  defender quem está ferido.
- 💅 **Mimada** — causa mais dano, mas cura menos e desobedece com frequência.

### Efeitos

🔥 Chamas, ☠️ Veneno e 🩸 Sangramento causam dano contínuo; 🌑 Maldição aumenta
o dano recebido e reduz a cura pela metade; ⚡ Paralisia impede movimento e
ataques; 🐌 Lentidão reduz a velocidade; 🛡️ Escudo absorve dano antes da vida.
Os efeitos aparecem como ícones sobre as unidades e nos cartões do HUD.

## Editor de campeões

O editor é dividido em três partes:

1. **Identidade** — nome, tipo, função, raridade, etiqueta, personalidade e
   sprite. A prévia ao lado mostra os atributos finais e as vantagens e
   desvantagens do campeão.
2. **Atributos** — a raridade define os pontos iniciais: **Comum 10**, **Raro
   15**, **Épico 10** e **Lendário 5**. O nível dá mais pontos; no nível 10
   todas as raridades convergem para **28 pontos**, então um comum máximo tem a
   mesma somatória de um lendário máximo. Cada ponto vale +20 de vida, +2 de
   ataque ou +5% nos demais atributos. Também é possível usar valores
   **negativos**: o atributo fica menor e os pontos voltam para o orçamento,
   então você pode enfraquecer um ponto para fortalecer outro. Isso **não é
   grátis**: qualquer valor negativo aplica um nerf global de **10% fixo +
   2,5% por ponto negativo** (máx. 85%) em vida, ataque, esquiva, crítico,
   obediência e velocidade. O ⚠ aparece no ponto negativo do editor, no cálculo
   em tempo real, no cartão do HUD, na ficha e sobre o boneco. Use **Zerar
   pontos** para voltar ao original. Campeões gerados (inimigos e novos
   campeões) já saem com uma distribuição aleatória, que pode deixar atributos
   abaixo do base.
3. **Habilidades** — exatamente três slots fixos: **Normal**, **Média** e
   **Ultimate**. Cada um tem seus próprios limites de multiplicador e recarga,
   além de tipo, forma (contato/projétil), efeitos, alcance e área. Cada slot
   aceita duas imagens independentes: **🗡️ Sprite do golpe** (troca o boneco
   durante a preparação e a execução; o ataque básico usa a do slot Normal) e
   **🚀 Sprite do projétil** (usada apenas nas habilidades à distância). O botão
   **↺ Padrão** restaura uma habilidade sem mexer nas outras. A descrição é
   atualizada na hora.

A prévia mostra **cálculos em tempo real** (vida efetiva, dano básico,
movimento, velocidade de ataque, esquiva, crítico, obediência e pontos livres) e
o dano estimado de cada habilidade. O botão **📥 Importar do banco** traz os
campeões prontos para o elenco. Excluir o último campeão deixa o elenco vazio —
os padrões não voltam sozinhos.

### Nível e XP

O nível vai de **1 a 10** e cada subida libera mais pontos de atributo. Para ir
do nível N para N+1 são necessários **50 × N XP** (50 para o 2, 100 para o 3,
..., 450 para o 10). A XP acumulada vira nível automaticamente. O botão
**+50 XP** na aba de atributos permite testar a progressão; nenhum modo de jogo
concede XP em batalha por enquanto. O nível e a XP aparecem no cartão do elenco,
na ficha do campeão e no editor.

**Salvar campeão** guarda neste navegador. **Publicar na nuvem** compartilha
o campeão; campeões já publicados são atualizados ao salvar.

## Correções e melhorias desta versão

### Expansão: modos, arenas e caixas

- **Modos de jogo**: clássico, infinito (você escolhe a próxima rodada) e
  sobrevivência (ondas infinitas).
- **Dificuldade da IA**: fácil, normal, difícil e brutal, ajustando atributos,
  reação, precisão das decisões e uso de ordens. A IA sempre usa a mesma
  quantidade de campeões que o jogador.
- **Atributos com variação dupla**: inimigos e campeões novos são gerados com
  pontos aleatórios para cima e para baixo, e o editor permite reduzir qualquer
  atributo abaixo do base para ganhar pontos em outro.
- **Progressão de raridade e nível**: pontos iniciais de 10/15/10/5 (comum,
  raro, épico, lendário) e níveis de 1 a 10 que nivelam o total em 28 pontos.
  XP e nível já existem no editor e na ficha; os modos ainda não dão XP.
- **17 personalidades** com efeitos reais no combate, incluindo a mesquinha
  (atraída por caixas), vingativa, sanguinária, teimosa, sortuda, protetora e
  mimada.
- **Arenas temáticas** com perigos próprios: fogo, gelo, raio, vento e
  espinhos. O raio cresce com o número de campeões e o fechamento começa aos
  20s, mais lento que antes.
- **Caixas de bônus** (cura, escudo, fúria, bênção e sorte) que aparecem com o
  tempo e também a cada crítico, perto de quem critou.
- **Posicionamento de 15s** antes da luta, com arrasto dos campeões e botão
  **▶ Iniciar agora**. Cada time fica restrito ao seu setor: duas metades com
  2 times, terços com 3, quartos com 4. As faixas coloridas mostram a área de
  cada um e o arrasto não deixa o campeão atravessar a divisória.
- Combate ágil com **movimento imprevisível** (vagueio com aproximações no
  ataque), **windup** curto e **empurrão real** que desloca o alvo.
- **HUD compacto** para dar mais altura à arena: cartões próprios em uma linha
  (ícone + recarga), inimigos em tira rolável e barra de topo enxuta.
- **Avisos contidos**: no máximo 2 por campeão, textos repetidos renovam o
  tempo em vez de empilhar, e o topo só mostra o que é decisivo (arena
  fechando, colapso, onda ou resultado).
- **Sprites maiores** no combate, sem recorte circular. Os inimigos não ficam
  todos vermelhos: cada time tem uma aura própria — 🔴 time 1, 🟢 time 2 (verde
  forte) e 🟣 time 3 — e o anel do chão usa a mesma cor. A sprite mantém as
  cores originais: o único filtro nela é o do shiny. A tira de inimigos no topo
  repete a cor na borda de cada cartão.
- **Resultado imediato**: se o seu time cair, a luta para na hora (inclusive com
  3 ou 4 times) e abre o painel com **Finalizar**, **Recomeçar** e **Trocar
  time**. Vitória mostra as mesmas opções; no infinito aparece também
  **Próxima rodada**.
- **Shiny**: cada campeão que entra em campo tem uma chance pequena de nascer
  com outro filtro — 🥈 prata (2%), 🥇 dourado (1%), 🌈 colorido/rainbow (0,1%)
  e 🎨 uma cor aleatória fixa (5%). Vale para todos os modos e times; um `✦`
  no cartão identifica a variante. No editor você pode marcar um campeão como
  shiny para que ele **sempre** apareça assim (o plano é, no futuro, limitar
  o sorteio aos inimigos de campanha, exceto os shiny que o jogador possui).
- **Texto da arena em pixels de tela**: avisos, números de dano, caixas, banner
  e ícones continuam legíveis em qualquer tamanho de janela.
- **Banco de campeões**: o elenco começa vazio e os campeões prontos são
  importados manualmente.
- Editor com cálculos em tempo real e dano estimado por habilidade.
- Arena pré-renderizada na resolução de exibição (blit ~1:1), além de sprites e
  brilhos em cache e limite de arenas mantidas na memória.

### Base

- Código separado em arquivos e pastas, com namespace `TBB`.
- Firebase migrado para SDK *compat* (funciona em `file://`); Analytics
  removido.
- Nuvem offline-first: elenco completo em `localStorage`, mesclagem por
  `id`/nome e botão explícito **Publicar na nuvem**.
- Cooldown de ordens por unidade (antes era global e travava o time todo).
- Registro da batalha na tela: habilidades, curas, buffs, debuffs, ordens e
  quedas, com opção de ocultar.
- Vida mínima de 200, ataque rebalanceado e três habilidades fixas por campeão
  (normal/média/ultimate), com limites próprios de multiplicador e recarga.
- Efeitos de status: chamas, veneno, sangramento, maldição, paralisia,
  lentidão e escudo, com ícones no canvas e no HUD.
- IA reescrita: pontua alvos por vantagem, vida, distância e ameaça; escolhe a
  habilidade e os efeitos mais úteis; e usa ordens táticas (recuar, defender,
  finalizar, focar).
- Comandos um por vez, com **Livre** para cancelar a ordem ativa e trava curta
  contra spam.
- Migração automática de `tbb_ro2` para `tbb_ro3` e de `tbb_ro3` para
  `tbb_ro4` (elenco inicial vazio, campeões do jogador preservados).
- Editor reorganizado em Identidade / Atributos / Habilidades, com prévia do
  campeão, vantagens/desvantagens e pontos de atributo explicados.
- Knockback dependente de `dt` (comportamento igual em qualquer FPS).
- Dano limitado por passo (`damageCap`), evitando picos em quedas de frame.
- Canvas com DPR limitado a 2, `ResizeObserver`, arena pré-renderizada e
  sprites em cache.
- HUD atualizado a 10 Hz com referências em cache.
- CSS consolidado, inputs com 16px (sem zoom no iOS), `100dvh`,
  `box-sizing` universal e respeito a `prefers-reduced-motion`.
- Tema claro/escuro/automático no botão 🌓.
- Validação de campeões e sprites antes de salvar ou publicar.
- Backup da versão original preservado e backup da versão anterior em
  `backup/pre-expansao/`.
