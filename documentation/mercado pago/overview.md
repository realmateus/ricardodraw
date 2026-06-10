
---
product_landing_hero:
 - title: Integre Checkout Transparente e personalize toda a experiência
 - message: Ofereça pagamentos seguros em seu site com uma API flexível do Mercado Pago, sem redirecionamentos para outro site.
 - image: https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/8/26/1758910958313-overviewmlbpt.png
 - benefit_icon: pay
 - benefit_title: Para pagamentos online
 - benefit_icon: categories
 - benefit_title: Integração avançada
 - benefit_icon: link
 - benefit_title: Sem redirecionamento
 - benefit_icon: edit
 - benefit_title: Personalização total
 - info: Busca opções sem desenvolvimento? Explore [mais soluções](/developers/pt/docs#online-payments).
---

---
product_landing_what_it_offers:
 - title: O que oferece
 - message: Combine diferentes funcionalidades para garantir a segurança e a conversão das operações.
 - benefit_title: Personalização e segurança
 - benefit_bullet: Desenvolva um checkout personalizado de acordo com as suas preferências.
 - benefit_bullet: Obtenha dados de compras por cartão com segurança e menor burocracia, permitindo a certificação PCI de forma simplificada.
 - benefit_title: Flexibilidade para integrar
 - benefit_bullet: Adapte às suas necessidades de negócio.
 - benefit_bullet: Escolha como as transações serão processadas: [manual ou automaticamente](/developers/pt/docs/checkout-api-orders/integration-model#bookmark_modos_de_processamento_de_orders).
 - benefit_title: Otimização dos pagamentos
 - benefit_bullet: Ofereça um processo de compra com poucas etapas.
 - benefit_bullet: Finalização de compra de forma prática e segura.
---

---
product_landing_how_works:
 - title: Como funciona
 - message: O cliente escolhe o produto e todo o processo de compra e pagamento é feito dentro da loja com a segurança do Mercado Pago, sem sair do seu site.
 - sub_title: Processo de pagamento
 - image: https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/4/5/1746473018715-overvieworderspt.gif
 - image_text: Consulte as taxas de processamento
 - image_text_link: /developers/pt/support/37740 
 - list_title: O comprador seleciona os produtos ou serviços desejados em sua loja.
 - list_title: Na tela de pagamento, deve selecionar um dos meios de pagamento integrados em seu checkout.
 - list_title: Em seguida, informa os dados necessários e finaliza a compra sem sair do ambiente da sua loja.
 - list_title: Após as APIs de Mercado Pago processarem o pagamento, a compra é confirmada.
 - button_description: Como integrar
 - button_link: /developers/pt/docs/checkout-api-orders/create-application
---

---
product_landing_what_differentiates:
 - title: Quais os diferenciais
 - message: Compare nossos checkouts e escolha qual se adequa melhor ao seu negócio. Consulte as [taxas](/developers/pt/support/37740).
 - highlight_text: Você está aqui
 - column_image: https://http2.mlstatic.com/storage/dx-devsite/docs-assets/custom-upload/2025/8/26/1758910958313-overviewmlbpt.png
 - column_product:  Checkout Transparente  
 - column_button_text: Como integrar
 - column_button_link: /developers/pt/docs/checkout-api-orders/overview#:~:text=UY-,Como,-integrar
 - column_product_svg_image: checkout-bricks-pt
 - column_product: Checkout Bricks
 - column_button_text: Ir ao resumo
 - column_button_link: /developers/pt/docs/checkout-bricks/landing
 - column_product_svg_image: checkout-pro-pt
 - column_product: Checkout Pro
 - column_button_text: Ir ao resumo
 - column_button_link: /developers/pt/docs/checkout-pro/overview
 - line_text: Esforço de integração
 - line_type: dots
 - line_values: 5|3|2
 - line_text: Nível de personalização
 - line_type: dots
 - line_values: 5|3|2
 - line_text: Design pronto para configurar
 - line_type: check
 - line_values: false|true|true
 - line_text: Experiência de pagamento
 - line_type: text
 - line_values: No seu site|No seu site|No Mercado Pago
 - line_text: Meios de pagamento
 - line_type: text
 - line_values:  Cartão de crédito, Pix, boleto e cartão de débito virtual Caixa      |  Cartão de crédito, Pix, boleto, cartão de débito virtual Caixa, Conta Mercado Pago e Linha de Crédito      |  Cartão de crédito, Pix, boleto, cartão de débito virtual Caixa, Conta Mercado Pago e Linha de Crédito    
 - line_text: Disponibilidade por país
 - line_type: sites
 - line_values: mlb, mla, mlm, mlc, mco|all|all
---

---
product_landing_how_integrate:
 - title: Como integrar
 - sub_title: Conheça as etapas necessárias para integrar esta solução.
 - requirement_title: Pré-requisitos
 - requirement_table_title: Conta de usuário Mercado Pago
 - requirement_table_list: Você precisa criar um usuário no Mercado Pago (ou no Mercado Livre) para ter uma [conta de vendedor](https://www.mercadopago[FAKER][URL][DOMAIN]/hub/registration/landing).
 - requirement_table_title: Chave Pix
 - requirement_table_list: Caso queira oferecer pagamentos via Pix, é necessário ter as [chaves Pix cadastradas](https://www.youtube.com/watch?v=60tApKYVnkA).
---

|||column1|||
---
product_landing_how_integrate:
 - list_title: Processo de integração
 - list_item: Criar uma aplicação a partir de [Suas integrações](/developers/panel/app)
 - list_item: Configurar o ambiente de desenvolvimento
 - list_item: Configurar os meios de pagamento desejados
 - list_item: Configurar as notificações de pagamento
 - list_item: Testar sua integração
 - list_item: Medir a qualidade da integração
 - list_item: Subir em produção
 - button_description: Quero começar a integrar
 - button_link: /developers/pt/docs/checkout-api-orders/create-application
---
|||column2|||
<div class="mermaid-overview">
    <pre class="mermaid">
flowchart TD
    A[Suas integrações] --> B[Criar uma aplicação]
    B --> C[Configurar o ambiente de desenvolvimento]
    C --> D[Configurar meio de pagamento]
    D --> E[Configurar notificações de pagamento]
    E --> F[Testar sua integração]
    F --> G{O teste foi bem-sucedido?}
    G -- Não --> H[Corrigir configuração] --> F
    G -- Sim --> I[Medir a qualidade da integração]
    I --> J{O que deseja fazer?}
    J -- Subir em produção --> K[Subir em produção]
    J -- Configurar outro meio de pagamento --> D
  </pre>
</div>
|||