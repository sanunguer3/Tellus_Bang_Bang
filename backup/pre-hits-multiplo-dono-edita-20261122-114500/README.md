# Tellus Bang Bang

Jogo de arena por times: monte um esquadrão de até 3 campeões, escolha quantos
times entram na arena e enfrente a IA. A arena se fecha com o tempo na maioria
dos modos, tem temas com perigos próprios, caixas de bônus e três modos de jogo.
Os campeões podem ser criados no editor, salvos na sua conta e compartilhados
na nuvem.

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
js/cloud.js                Firebase (compat): login e senha, perfil e Firestore
js/account.js              Tela de login e painel administrativo do dono
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
- **Entrar/Criar conta** usa e-mail e senha. O perfil de cada jogador fica em
  `usuarios/{uid}` com elenco, time, modo, dificuldade, arena, tema e câmera.
- **Publicar/editar/excluir** exige login. Só o criador altera o campeão;
  o e-mail `sanunguer3@gmail.com` também pode apagar campeões alheios pelo
  **Painel do dono**.
- Tudo também fica no `localStorage` (`tbb_ro4` etc.), então o jogo continua
  funcionando offline. Campeões da nuvem são mesclados por `id`/nome.

### Banco de campeões e elenco vazio

A partir desta versão o jogo **não começa com os campeões prontos no elenco**.
Eles ficam no **Banco**, um catálogo disponível para importação manual.

- Na **Sala de batalha** (elenco vazio) ou no **editor de campeões**, use
  **📥 Importar do banco** para trazer os campeões prontos para o seu elenco.
- Só dá para entrar numa batalha com pelo menos um campeão no elenco.
- A migração de `tbb_ro3` limpa os 9 campeões iniciais do elenco e preserva os
  campeões criados ou publicados por você. A chave antiga `tbb_ro2` também
  recebe o novo conjunto de 3 habilidades e as personalidades novas.

### Ativar o login por e-mail e senha

Sem login o jogo funciona apenas neste navegador e mostra
`entre para salvar na nuvem`.

1. Abra o [Console do Firebase](https://console.firebase.google.com/) do
   projeto `tellus-bang-bang`.
2. Vá em **Authentication → Sign-in method**.
3. Ative **Email/Password** (E-mail/senha) e salve.
4. Crie a conta `sanunguer3@gmail.com` ou entre com ela para ter o painel do dono.
5. Recarregue o jogo e use **🔑 Entrar** na tela inicial.

### Publicar as regras do Firestore

No Console: **Firestore Database → Rules**, cole o conteúdo de
`firestore.rules` e publique.

Ou, com a CLI do Firebase instalada:

```bash
firebase login
firebase deploy --only firestore:rules
```

As regras permitem leitura pública de `/campeoes`, escrita apenas pelo
criador (`dono == request.auth.uid`), permitem que o e-mail
`sanunguer3@gmail.com` apague campeões de outros jogadores e liberam cada
jogador a ler/gravar somente seu próprio documento em `usuarios/{uid}`.
Os documentos são limitados a ~100 KB.

## Como jogar

- Na **Sala de batalha**, escolha o **modo**, a **dificuldade da IA**, a
  **câmera** (`🎯 Fixa` ou `👣 Seguir líder`) e a **arena** (ou `Aleatória`).
  Depois toque nos campeões para montar seu time (até 3) e escolha de 2 a 4
  times na arena.
- **Posicionamento (15s):** a luta começa num preparo de 15 segundos. Arraste
  seus campeões pelo canvas para reposicioná-los; o botão **▶ Iniciar agora**
  pula o tempo restante. Se o tempo acabar, a luta começa sozinha.
- Durante a luta, os comandos valem para o líder (★). Troque de líder com
  `A`/`D`, `1`–`3` ou tocando nele.
- Comandos: `J` defender, `K` recuar, `L` livre, `U` atacar, `I` finalizar,
  `O` focar. Toque em um inimigo para focá-lo.
- **Toque no cenário:** num ponto vazio da arena, só o **líder selecionado**
  passa a *querer* ir naquela direção por 5s. É uma intenção fraca que inclina
  a IA dele, não uma perseguição; o ponto aparece tracejado.
- **Câmera:** com `Fixa` a arena inteira fica centralizada o tempo todo. Com
  `Seguir líder` há um leve zoom e a câmera acompanha o campeão selecionado
  (limitada para não mostrar fora da arena). A escolha fica salva no perfil.
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
- Toque na etiqueta de um campeão para trocá-la. São 10 opções: Tanque,
  Briguento, Dano, Atirador, Assassino, Mago, Suporte, Curandeiro, Controlador
  e Utilitário.

## Modos de jogo

| Modo | Como funciona |
| --- | --- |
| ⚔️ **Clássico** | Uma batalha. Vence quem sobrar; a arena fecha com o tempo. |
| ♾️ **Infinito** | Ao vencer, você escolhe entre encerrar, recomeçar, trocar de time ou ir para a próxima rodada. Cada rodada deixa os inimigos mais fortes. O resumo mostra rodada e vitórias. |
| 🧟 **Sobrevivência** | A luta continua até seu time cair. Zumbis, demônios e criaturas fracas surgem por tempo — o intervalo cai de 3s para 0,7s — e campeões fortes entram de vez em quando (a partir de 24s, depois a cada 26s), ficando mais comuns com o passar do tempo. A arena **não diminui**. O resumo mostra a onda alcançada. |

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

Os três níveis compartilham os mesmos limites amplos, escolhidos livremente no
editor:

| Nível | Papel | Multiplicador | Recarga |
| --- | --- | --- | --- |
| ◆ Normal | habilidade básica | 0,1× a 8× | 1–60s |
| ◆◆ Média | mais forte ou com mais efeitos | 0,1× a 8× | 1–60s |
| ★ Ultimate | golpe decisivo | 0,1× a 8× | 1–60s |

Cada habilidade tem um **Alvo** explícito: 👤 Você, 🤝 Aliados ou 👾 Inimigo
atual. Buffs e debuffs funcionam direto nesse alvo e **não mostram nem usam**
alcance, velocidade de projétil ou sprite de disparo. Dano e efeitos ofensivos
continuam com Forma, Alcance (20–600), Velocidade do projétil (60–900) e Raio de
área (20–300); eles só funcionam **se o golpe acertar**.

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

No editor, efeitos **não vêm todos marcados**: clique em **+ Adicionar efeito**,
escolha apenas os desejados nos grupos ✨ Positivos, 💜 Negativos e 🔧 Mecânicos,
e confirme. Cada efeito adicionado ganha uma linha com:

- descrição do que faz com os números atuais;
- **Base:** em que a força se baseia (vida máxima, ataque de quem aplicou,
  pontos percentuais, etc.);
- campos de **Duração (s)** e **Força** quando o efeito usa esses ajustes.

Efeitos de dano contínuo (🔥 Chamas, ☠️ Veneno e 🩸 Sangramento) usam uma
porcentagem do ataque de quem aplicou por segundo. 🌑 Maldição aumenta o dano
recebido pela força escolhida e reduz cura pela metade. ⚡ Paralisia e 🐌
Lentidão têm duração reduzida pela resistência a controle da personalidade.
🛡️ Escudo e 💚 Cura são porcentagens da vida máxima do alvo. 💥 Impulso é o antigo
buff implícito de +30% de ataque e velocidade, agora explícito e configurável.

Os demais positivos — 🎯 Crítico, ⚡ Velocidade de ataque, 👟 Movimento, 💨
Esquiva, 🩸 Roubo de vida, 😤 Fúria, 🔰 Guarda, 💚 Regeneração e ✨ Purificação —
também têm duração e força próprias. O alvo escolhido na habilidade define quem
recebe tudo isso. Todos os efeitos aparecem como ícones sobre as unidades e nos
cartões do HUD.

## Editor de campeões

O editor é dividido em três partes:

1. **Identidade** — nome, tipo, função, raridade, uma das **10 etiquetas**,
   personalidade e sprite. A prévia ao lado mostra os atributos finais e as
   vantagens e desvantagens do campeão.
2. **Atributos** — a raridade define os pontos iniciais: **Comum 10**, **Raro
   15**, **Épico 10** e **Lendário 5**. O nível dá mais pontos; no nível 10
   todas as raridades convergem para **28 pontos**, então um comum máximo tem a
   mesma somatória de um lendário máximo. Cada ponto vale +20 de vida, +2 de
    ataque ou +5% nos demais atributos. Use os botões **−/+** ou digite direto
    no campo ao lado (de **−30 a +60**) para mexer livremente. Valores
    **negativos** devolvem pontos para o orçamento, mas **não são grátis**:
    qualquer valor negativo aplica um nerf global de **10% fixo + 2,5% por ponto
    negativo** (máx. 85%) em vida, ataque, esquiva, crítico, obediência e
    velocidade. O ⚠ aparece no ponto negativo do editor, no cálculo em tempo
    real, no cartão do HUD, na ficha e sobre o boneco. Use **Zerar pontos** para
    voltar ao original. Campeões gerados (inimigos e novos campeões) já saem com
    uma distribuição aleatória, que pode deixar atributos abaixo do base.

    Marque **🔓 Modo livre (sem limite de pontos)** para ignorar o orçamento e
    elevar o teto dos atributos percentuais de **76% para 95%**. O nerf dos
    valores negativos continua valendo no modo livre.
3. **Habilidades** — exatamente três slots fixos: **Normal**, **Média** e
   **Ultimate**. Todos usam os mesmos limites amplos: multiplicador de **0,1× a
   8×** e recarga de **1 a 60s**. Há também um seletor de **Alvo** e o botão
   **+ Adicionar efeito**: o painel mostra os efeitos por grupo e você escolhe quais
   entram. Depois, cada efeito adicionado permite ajustar **duração** e **força**
   e mostra o que faz e em que se baseia. Alcance, velocidade de projétil, forma e
   sprite de projétil aparecem só quando a habilidade precisa acertar um alvo.
   Cada slot aceita duas imagens independentes: **🗡️ Sprite do golpe** (troca o
   boneco durante a preparação e a execução; o ataque básico usa a do slot
   Normal) e **🚀 Sprite do projétil** (usada apenas nas habilidades à distância).
   O botão **↺ Padrão** restaura uma habilidade sem mexer nas outras. A descrição
   é atualizada na hora.

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

### Conta, sobrevivência e câmera

- **Login por e-mail e senha** na tela inicial. A conta salva elenco, time,
  modo, dificuldade, arena, tema e câmera em `usuarios/{uid}` na nuvem e em
  cache no navegador. Sem login o jogo continua funcionando localmente.
- **Painel do dono:** a conta `sanunguer3@gmail.com` vê o botão 🛡️ no início e
  no editor, lista os campeões publicados por outros jogadores e pode apagá-los.
  As regras do Firestore garantem a permissão no servidor, não só na interface.
- **Sobrevivência reformulada:** criaturas básicas fracas (zumbi, demônio e
  criatura), reposição por tempo com intervalo cada vez menor e campeões fortes
  ocasionais que ficam mais frequentes com o tempo. A arena não encolhe nem
  precisa “reabrir”.
- **Câmera na luta:** escolha entre fixa e seguir o líder, com zoom leve e
  limites para não revelar fora da arena.
- **Clique direcional:** tocar no chão cria uma intenção de direção de 5s apenas
  no campeão selecionado; os outros continuam com a IA normal.

### Editor livre, mais efeitos e etiquetas

- **Modo livre:** o checkbox 🔓 no editor ignora o orçamento de pontos e eleva o
  teto dos atributos percentuais de 76% para 95%. O nerf dos valores negativos
  continua ativo.
- **Atributos diretos:** cada atributo agora tem um campo numérico de −30 a +60,
  além dos botões −/+, para ajustar sem clicar várias vezes.
- **Habilidades realmente livres:** multiplicador de 0,1× a 8×, recarga de 1 a
  60s, alcance de 20 a 600, velocidade de projétil de 60 a 900 e raio de área de
  20 a 300 em todos os três níveis.
- **Efeitos sob demanda:** 🎯 crítico, ⚡ velocidade de ataque, 👟 movimento, 💨
  esquiva, 🩸 roubo de vida, 😤 fúria, 🔰 guarda, 💚 regeneração, ✨ purificação
  e 💥 impulso são escolhidos um a um no painel **+ Adicionar efeito**. Cada um
  mostra descrição, base, duração e força configuráveis e vai para o alvo
  escolhido na habilidade.
- **De 3 para 10 etiquetas:** Tanque, Briguento, Dano, Atirador, Assassino,
  Mago, Suporte, Curandeiro, Controlador e Utilitário. A etiqueta aparece com
  nome e ícone no elenco, na ficha e no editor.

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