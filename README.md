# my-story-maker

Editor visual de stories e colagens no navegador, com fluxo de trabalho
semelhante a um editor gráfico: canvas 9:16 ou 1:1, templates, mídia, texto,
camadas, histórico, projetos locais e exportação.

## Usar localmente

Como o editor usa módulos JavaScript no navegador e carrega imagens externas,
abra-o por um servidor HTTP local em vez de abrir `index.html` diretamente:

```bash
npx serve .
```

Depois acesse a URL informada pelo comando. Não há dependências de build nem
backend obrigatório.

## Recursos

- Templates vazio, grid e mosaico
- Proporções Story 9:16 e Post 1:1
- Upload e arraste de imagens para o canvas, feed ou células dos templates
- Upload de vídeos MP4, WebM e QuickTime para o canvas
- Filtros predefinidos e ajustes de brilho, contraste, exposição, sombras,
  realces, temperatura, tint, saturação, clareza e zoom
- Texto editável com cor, tamanho, fonte, negrito, itálico, sublinhado e
  alinhamento
- Formas, linhas e adesivos
- Seleção múltipla com Ctrl/Meta/Shift, selecionar tudo, alinhamento,
  agrupamento e desagrupamento
- Camadas com thumbnails, nomes editáveis, ordenação, visibilidade, bloqueio,
  duplicação e remoção
- Redimensionamento, rotação e propriedades numéricas X/Y/largura/altura,
  rotação, opacidade e filtro
- Histórico com desfazer/refazer e atalhos de teclado
- Música de fundo com upload, reprodução, pausa, parada, volume, loop,
  waveform, troca e remoção
- Projetos salvos no IndexedDB do navegador, com criar, abrir, renomear,
  excluir e autosave local
- Importação/exportação de projetos `.json`, incluindo grupos aninhados e
  imagens incorporadas quando possível
- Pré-visualização do canvas e exportação em PNG, JPG e WEBP
- Menus Arquivo, Editar, Imagem, Camada e Visualizar
- Interface responsiva para celular e tablet, com drawer de ferramentas e
  suporte a gestos de toque
- Service worker para cache do app shell e uso offline após o primeiro acesso

## Validação

Com Node.js instalado, execute:

```bash
npm test
```

Esse comando verifica a sintaxe de todos os arquivos JavaScript.

O service worker exige acesso por HTTP/HTTPS; ele não funciona ao abrir o
arquivo diretamente com `file://`.

### Suíte visual móvel

A suíte Playwright cobre Chromium, WebKit e Firefox em viewports de celular:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e:mobile
```

Os testes validam carregamento responsivo, troca de proporção, drawer de
ferramentas, upload de imagens e vídeos, drag-and-drop, seleção/agrupamento,
restauração de projetos, undo/redo e exportação. Evidências de falha ficam em
`test-results/` como screenshot, vídeo e trace. O workflow
`.github/workflows/validate.yml` executa a validação de sintaxe a cada push e
pull request.

## Limitações conhecidas

A exportação depende de imagens que permitam CORS. Imagens carregadas do
computador (`blob:`), imagens em `data:` e servidores que enviam
`Access-Control-Allow-Origin` funcionam normalmente. Se uma imagem externa não
permitir CORS, o navegador pode impedir a exportação; nesse caso, remova a
imagem, use um arquivo local ou tente novamente em PNG.

O armazenamento de projetos usa o IndexedDB do navegador e, portanto, é local
ao perfil e ao dispositivo. Limpar os dados do site pode remover os projetos
salvos no navegador.

Arquivos de música locais permanecem disponíveis no projeto salvo no mesmo
perfil do navegador, mas não são incorporados ao JSON exportado. A exportação
de imagem também não inclui áudio; a música funciona na pré-visualização e no
projeto editável.
