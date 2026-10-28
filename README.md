# my-story-maker

Editor de stories e colagens 9:16 no navegador, com templates, fotos, filtros,
texto, adesivos, camadas, histórico e exportação de imagens.

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
- Upload e arraste de imagens para o canvas ou para células
- Filtros predefinidos e ajustes manuais
- Texto, formas, linhas e adesivos
- Camadas, redimensionamento, rotação e histórico
- Projetos salvos no IndexedDB do navegador
- Importação/exportação de projetos `.json`
- Exportação em PNG, JPG e WEBP
- Layout responsivo para celular e tablet
- Cache do app shell para uso offline após o primeiro carregamento

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
ferramentas, upload, drag-and-drop, undo/redo e exportação. Evidências de
falha ficam em `test-results/` como screenshot, vídeo e trace.

## Limitações conhecidas

A exportação depende de imagens que permitam CORS. Imagens carregadas do
computador (`blob:`), imagens em `data:` e servidores que enviam
`Access-Control-Allow-Origin` funcionam normalmente. Se uma imagem externa não
permitir CORS, o navegador pode impedir a exportação; nesse caso, remova a
imagem, use um arquivo local ou tente novamente em PNG.

O armazenamento de projetos usa o IndexedDB do navegador e, portanto, é local
ao perfil e ao dispositivo. Limpar os dados do site pode remover os projetos
salvos no navegador.
