# Modelo de integração

 Checkout Transparente  agora processa pagamentos com **Orders**. Se trata de uma API projetada para simplificar seu desenvolvimento com o Mercado Pago: com uma única integração, você poderá acessar diversas soluções de pagamento.

Além disso, a API torna o código de integração mais intuitivo e fornece mensagens de erro mais detalhadas, facilitando o processo de desenvolvimento.

## Diferenças no processamento

Anteriormente, os pagamentos via  Checkout Transparente  eram processados exclusivamente pela **API de Pagamentos**. Agora, também é possível processá-los por meio de Orders, que oferece uma alternativa eficiente e simples para a integração. 

Veja abaixo as principais diferenças entre as duas opções.

| Funcionalidade  |  API de Pagamentos  | API de Orders |
| --- | --- |--- |
| Processamento do pagamento  | Automático (crie e processe sua transação). | [Automático ou manual](/developers/pt/docs/checkout-api-orders/integration-model#bookmark_modos_de_processamento_de_orders) (escolhendo quando processar a  sua transação). |
| Transações | Uma transação por requisição. | Múltiplas transações por requisição. |
| Operações  | [Pagamentos online](/developers/pt/docs#online-payments). | [Pagamentos online](/developers/pt/docs#online-payments) e [Pagamentos presenciais](/developers/pt/docs#inperson-payments) (Point do Mercado Pago).|
| Notificações  | Configuração avançada por `notification_url`. | Configuração mais simples a partir da seção de [Notificações](/developers/pt/docs/checkout-api-orders/notifications) em [Suas integrações](/developers/panel/app). |
| Validação dos erros  | Retorna um erro por vez.  | Retorna uma lista com todos os erros na requisição. |

## Modos de processamento de Orders

Uma order de pagamentos online pode ser criada para ser processada de dois modos: **Modo automático** e **Modo manual**. 

A definição do modo de processamento será realizada no momento da criação da order, por meio do parâmetro `processing_mode`. Seu valor deve ser `automatic`, para processamentos automáticos, ou `manual`, para processar a order manualmente.

::::TabsComponent

:::TabComponent{title="Modo automático"}
O **modo automático** é o modo padrão da aplicação. Por meio dele, a transação é concluída em uma única etapa e as modificações são limitadas. Para criar a order no modo automático, o campo `processing_mode`, responsável por definir o formato de criação e processamento da transação, será definido como `automatic` e todas as informações serão enviadas em uma única requisição.

As operações permitidas são:

- [**Criar e processar order**](/developers/pt/reference/orders/online-payments/create/post): responsável pela criação da order já com o processamento da transação simultâneo.
- [**Obter order**](/developers/pt/reference/orders/online-payments/get-order/get): permite obter informações sobre uma order, incluindo o seu status em tempo real.
- [**Buscar order**](/developers/pt/reference/orders/online-payments/search/get): permite buscar orders de forma massiva, utilizando diversos filtros e informações de paginação.
- [**Capturar order**](/developers/pt/reference/orders/online-payments/capture/post): possibilita a captura do valor autorizado de uma order. Essa opção só é válida para cartões de crédito.
- [**Cancelar order**](/developers/pt/reference/orders/online-payments/cancel-order/post): responsável pelo cancelamento de uma order já existente, mas que ainda não foi processada. 
- [**Reembolsar order**](/developers/pt/reference/orders/online-payments/refund/post): possibilita o estorno total ou parcial de um pagamento. A order será reembolsada totalmente se todas as transações forem estornadas por completo. 
  - **Reembolso total**: não deverá ser indicado o valor a ser reembolsado no `body` da requisição, que deve ser enviado vazio.
  - **Reembolso parcial**: deverá ser especificada a quantia a ser reembolsada no `body` da requisição junto com o ID da transação. Todas as outras transações permanecerão como estão e somente a transação alterada será reembolsada.

:::
:::TabComponent{title="Modo manual"}
O **modo manual** é o modo personalizável da aplicação, que permite dividir o processamento do pagamento em etapas que podem ser configuradas e executadas de maneira incremental.

Além disso, é possível configurar cada etapa do processo de pagamento, adaptando-se a diferentes necessidades e cenários.

As operações permitidas são:

- [**Criar order (sem transações ou com transações)**](/developers/pt/reference/orders/online-payments/create/post): responsável pela criação e autorização da order, mas sem o processamento simultâneo.
- [**Adicionar transação**](/developers/pt/reference/orders/online-payments/add-transaction/post): essa operação de adição de transações só pode ser feita no modo manual e é responsável por adicionar mais de uma transação em um mesmo _payload_. 
- **[Alterar](/developers/pt/reference/orders/online-payments/update-transaction/put) e/ou [remover transação](/developers/pt/reference/orders/online-payments/delete-transaction/delete)**: a alteração e remoção de transações só pode ser feita no modo manual e permitem mudar informações de pagamento que já tinham sido adicionadas anteriormente à order. São operações que modificam um item dentro de qualquer campo do parâmetro `transactions`.
- [**Capturar order**](/developers/pt/reference/orders/online-payments/capture/post): responsável por capturar o valor autorizado de um order. Essa opção só é válida para cartões de crédito.
- [**Processar transação**](/developers/pt/reference/orders/online/process-order/post): possibilita a execução das transações criadas e/ou alteradas no modo manual. 
- [**Obter order**](/developers/pt/reference/orders/online-payments/get-order/get): permite obter informações sobre uma order, incluindo o seu status em tempo real.
- [**Buscar order**](/developers/pt/reference/orders/online-payments/search/get): permite buscar orders de forma massiva, utilizando diversos filtros e informações de paginação.
- [**Cancelar order**](/developers/pt/reference/orders/online-payments/cancel-order/post): responsável pelo cancelamento de uma order já existente, mas que ainda não foi processada. 
- [**Reembolsar order ou transação**](/developers/pt/reference/orders/online-payments/refund/post): no modo manual podem ser criados estornos totais ou parciais de um pagamento. A order será reembolsada totalmente se todas as transações forem estornadas por completo. 
  - **Reembolso total**: não deverá ser indicado o valor a ser reembolsado no `body` da requisição, que deve ser enviado vazio.
  - **Reembolso parcial**: deverá ser especificada a quantia a ser reembolsada no `body` da requisição junto com o ID da transação. Todas as outras transações permanecerão como estão e somente a transação alterada será reembolsada.

:::

::::

---
product_landing_how_integrate:
 - button_description: Começar a integrar
 - button_link: /developers/pt/docs/checkout-api-orders/create-application
---