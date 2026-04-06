# E-commerce de Açaí com Admin + WhatsApp Direto (wa.me)

Projeto fullstack com loja online, carrinho, checkout rápido e painel administrativo para operação diária. Nesta fase, o envio do pedido é feito por **link direto do WhatsApp** (`wa.me`) com mensagem formatada automaticamente.

## Visão do projeto

Objetivo: permitir que uma loja de açaí venda online de forma simples e profissional, sem depender de integração complexa com API externa nesta etapa.

### Entregas principais

- Loja online responsiva (banner, categorias, destaques)
- Carrinho com controle de quantidade e total automático
- Checkout com nome + telefone + tipo de pedido (entrega/retirada)
- Persistência de pedidos no Neon Postgres (`pending_whatsapp`)
- Redirecionamento para WhatsApp com mensagem pronta
- Painel admin com pedidos, produtos e configurações da loja

## Stack

- **Frontend:** Next.js 14 + TypeScript + TailwindCSS
- **Backend:** API Routes do Next.js (persistência e administração)
- **Banco:** Neon Postgres
- **Imagens:** Cloudinary (endpoint já preparado)
- **Deploy inicial:** Netlify (app Next.js)

## Arquitetura

```txt
app/
  storefront, checkout, admin, api
components/
  componentes de UI e estado de carrinho
lib/
  db, auth, utilitários, whatsapp e formatter de mensagem
services/
  regras de negócio (pedidos, produtos, settings)
types/
  contratos de payload e domínio
```


## Bootstrap automático do banco (sem terminal local)

Se `DATABASE_URL` estiver configurada, o backend aplica automaticamente o SQL de `db/schema.sql` na primeira operação que tocar o banco (catálogo, checkout, admin, etc.).

Isso permite usar só **GitHub + Netlify + Neon** sem precisar rodar terminal local para criar tabela manualmente.

## Banco de dados (Neon)

Tabelas:

- `products`
- `product_images`
- `categories`
- `orders`
- `order_items`
- `store_settings`

### Rodando migração/seed

```bash
npm install
npm run db:migrate
npm run db:seed
```

## Como rodar localmente

1. Copie as variáveis:

```bash
cp .env.example .env.local
```

2. Preencha `DATABASE_URL`.
3. Execute:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Abrir o site mesmo sem banco/fotos (modo demonstração)

Se você quiser apenas validar layout e fluxo do checkout antes de conectar o Neon/Cloudinary:

1. **Não defina** `DATABASE_URL`.
2. Rode:

```bash
npm install
npm run dev
```

Nesse modo, o sistema usa dados simulados (`lib/demo-data.ts`) para:
- página inicial,
- produtos no admin,
- checkout e link de WhatsApp.

> Isso permite publicar na Netlify e navegar normalmente, mesmo sem catálogo real e sem fotos finais.

## Variáveis de ambiente

- `DATABASE_URL`: conexão Neon Postgres
- `ADMIN_PASSWORD`: senha do `/admin`
- `CLOUDINARY_CLOUD_NAME`: conta cloudinary
- `CLOUDINARY_UPLOAD_PRESET`: preset upload unsigned (necessário quando não usar assinatura)
- `CLOUDINARY_API_KEY`: chave da API Cloudinary (opcional para upload assinado)
- `CLOUDINARY_API_SECRET`: segredo da API Cloudinary (opcional para upload assinado)
- `NEXT_PUBLIC_SITE_URL`: URL pública da loja usada em links e mensagens

### Checklist rápido (Netlify) para upload e banco

Se você usa apenas GitHub + Netlify + Neon, valide no painel da Netlify:

1. `DATABASE_URL` apontando para o projeto Neon correto.
2. `ADMIN_PASSWORD` definido em **Production** e **Deploy Previews**.
3. `CLOUDINARY_CLOUD_NAME` e (`CLOUDINARY_UPLOAD_PRESET` ou `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`) definidos no mesmo ambiente do deploy.
4. Após alterar qualquer variável, faça **novo deploy** (redeploy) para aplicar.

> Se o upload falhar, o endpoint `/api/upload` agora retorna detalhes do erro do Cloudinary para facilitar diagnóstico.

## WhatsApp direto: como funciona

Arquivos principais:

- `lib/formatOrderMessage.ts` → `gerarMensagemPedido(order)`
- `lib/whatsapp.ts` → `gerarLinkWhatsApp(order)`

Fluxo:

1. Usuário finaliza checkout.
2. API salva pedido com status `pending_whatsapp`.
3. Backend monta mensagem organizada.
4. Backend retorna URL `https://wa.me/NUMERO?text=MENSAGEM_ENCODED`.
5. Frontend redireciona o usuário para o WhatsApp.

### Como mudar o número do WhatsApp

No painel admin, em **Configurações** (`/admin/settings`), altere o campo:

- `owner_whatsapp_number`

O backend sanitiza o número (remove caracteres não numéricos) antes de gerar `wa.me`.
As configurações de nome da loja, mensagem padrão e URL pública também entram na mensagem gerada.

## PWA separado: Site e Painel Admin

Agora o projeto expõe **dois atalhos PWA distintos**:

- **Site da loja**: `manifest.webmanifest`
- **Painel Admin**: `admin/manifest.webmanifest`

Cada um possui:

- `id` e `start_url` diferentes (evita sobreposição de atalho),
- nome curto diferente,
- ícone dedicado.

### Ícones prontos para substituir

- Site:
  - `public/icons/site-icon-192.svg`
  - `public/icons/site-icon-512.svg`
- Admin:
  - `public/icons/admin-icon-192.svg`
  - `public/icons/admin-icon-512.svg`

Você pode trocar esses arquivos pela arte final sem precisar mudar código.

## Cache e atualização de versão (evitar app antigo)

- Service worker atualizado para versão `refreshice-v3`.
- Cache antigo é removido automaticamente na ativação.
- Rotas `/api`, `/admin` e `/_next` não são cacheadas pelo SW.
- `sw.js` e manifests receberam `Cache-Control: no-store` no `netlify.toml`.

Com isso, a chance de ficar preso em versão antiga diminui bastante em dispositivos móveis.

## Regras de atendimento (admin)

Em Configurações, o admin controla:

- `allow_delivery`
- `allow_pickup`

Comportamento no checkout:

- só um ativo → mostra apenas ele
- os dois ativos → mostra os dois
- nenhum ativo → checkout bloqueado com mensagem clara

## Operação de entregas (fase atual)

- Origem de frete/rota com prioridade: **localização atual do entregador** (quando habilitada no admin) → **CEP da loja**.
- Cliente no checkout pode escolher entre **CEP** ou **Usar localização atual**.
- Cálculo de frete por km aceitando decimal em reais (`0,20`, `1.75`, etc.).
- Estratégias no painel de pedidos: **rota mais rápida**, **rota mais econômica** e **ordem por horário**.
- Ordenação e exibição de horários normalizadas para **America/Sao_Paulo (Brasília)**.
- Base plugável de roteirização em `lib/routing.ts` com interface pronta para provedor externo.

## Limitações da abordagem atual (fase 1)

- Depende do cliente ter WhatsApp disponível
- Não confirma entrega de mensagem automaticamente
- Não possui bot, webhook ou leitura de resposta

## Diagnóstico rápido de erro no deploy (Netlify + Neon)

Se aparecer erro do tipo **"Application error: a server-side exception has occurred"**:

1. Verifique no Netlify se `DATABASE_URL` está preenchida corretamente.
2. Confirme se as tabelas foram criadas no Neon:
   - `products`, `product_images`, `categories`, `orders`, `order_items`, `store_settings`.
3. Rode migração/seed apontando para o mesmo banco do deploy.
4. Se o banco estiver indisponível, o app agora entra em **modo demonstração** para não derrubar a vitrine.

## Mapa funcional (análise do projeto)

### Área pública

- **`/` (vitrine):** lista produtos/categorias, filtra por categoria, adiciona ao carrinho.
- **`/checkout`:** recebe nome/telefone/endereço, valida tipos de atendimento e finaliza pedido.
- **`/order-success`:** página de confirmação.

### API pública

- **`GET /api/products`:** retorna catálogo + categorias + configurações da loja.
- **`GET /api/settings`:** retorna flags de atendimento e dados da loja.
- **`POST /api/orders`:** cria pedido e devolve `whatsappUrl`.
- **`POST /api/upload`:** endpoint preparado para upload (Cloudinary).

### Área administrativa

- **`/admin/login`:** autenticação simples por senha (`ADMIN_PASSWORD`).
- **`/admin/orders`:** lista pedidos e altera status.
- **`/admin/products`:** cria/lista/remove produtos.
- **`/admin/settings`:** altera WhatsApp da loja e regras de entrega/retirada.

### API admin

- **`/api/admin/login`**
- **`/api/admin/orders`**
- **`/api/admin/orders/[id]/status`**
- **`/api/admin/products`**
- **`/api/admin/settings`**

Todas protegidas por cookie de sessão.

## Próximos passos (fase 2)

- Integração oficial com WhatsApp Business API (Meta)
- Webhook de status de mensagens
- Fila/retry para mensagens falhadas
- Dashboard com métricas de conversão por canal
