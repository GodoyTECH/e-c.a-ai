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

## Variáveis de ambiente

- `DATABASE_URL`: conexão Neon Postgres
- `ADMIN_PASSWORD`: senha do `/admin`
- `CLOUDINARY_CLOUD_NAME`: conta cloudinary
- `CLOUDINARY_UPLOAD_PRESET`: preset upload unsigned

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

## Regras de atendimento (admin)

Em Configurações, o admin controla:

- `allow_delivery`
- `allow_pickup`

Comportamento no checkout:

- só um ativo → mostra apenas ele
- os dois ativos → mostra os dois
- nenhum ativo → checkout bloqueado com mensagem clara

## Limitações da abordagem atual (fase 1)

- Depende do cliente ter WhatsApp disponível
- Não confirma entrega de mensagem automaticamente
- Não possui bot, webhook ou leitura de resposta

## Próximos passos (fase 2)

- Integração oficial com WhatsApp Business API (Meta)
- Webhook de status de mensagens
- Fila/retry para mensagens falhadas
- Dashboard com métricas de conversão por canal
