# Cartões 

A integração de pagamentos com **cartão de crédito e/ou débito** no  Checkout Transparente  pode ser realizada de duas maneiras. A **integração recomendada** é através do **_Card Payment Brick_**, onde o Brick se encarrega de buscar as informações necessárias para efetuar o pagamento. Mas, se você quiser ser o responsável por definir como essas informações serão buscadas, você pode realizar sua integração através de **_Core Methods_**, disponíveis para websites e aplicativos móveis Android e iOS.

:::::TabsComponent

::::TabComponent{title="Card Payment Brick (Web)"} 
Na integração via _Card Payment Brick_ para websites, a biblioteca `MercadoPago.js`, incluída no seu projeto durante a [configuração do ambiente de desenvolvimento](/developers/pt/docs/checkout-api-orders/development-environment), é responsável por obter as informações necessárias para a geração de um pagamento. Ou seja, ela realiza uma busca pelos tipos de documentos disponíveis para o país correspondente e, conforme os dados do cartão são inseridos, também busca as informações relativas ao emissor e às parcelas disponíveis.

Toda a informação envolvida no processamento da transação é armazenada no _backend_, em conformidade com os padrões de [segurança PCI](/developers/pt/docs/security/pci).

Além disso, o componente oferece a possibilidade de orientar o usuário com alertas sobre campos incompletos ou possíveis erros ao preencher os dados, otimizando o processo de compra.

<pre class="mermaid">
  sequenceDiagram
    participant Navegador as Navegador do comprador
    participant Frontend as Front-end do integrador
    participant MPjs as MercadoPago.js
    participant Backend as Back-end do integrador
    participant API as API Mercado Pago

    Navegador->>Frontend: 1. O comprador acessa a tela de pagamento.
    Frontend->>MPjs: 2. O front-end do integrador baixa e inicializa o SDK JS do Mercado Pago.
    Frontend->>Navegador: 3. O front-end do integrador exibe o formulário de pagamento.
    Navegador->>Frontend: 4. O comprador preenche o formulário e finaliza o pagamento.
    Frontend->>MPjs: 5. O front-end do integrador usa o SDK JS para criar o _token_ que conterá os dados do cartão de forma segura.
    Frontend->>Backend: 6.O front-end do integrador envia o _token_ do cartão e os dados de pagamento para seu back-end.
    Backend->>API: 7. Do back-end, são chamados os serviços do Mercado Pago para criar o pagamento.
    API->>Navegador: 8. O front-end do integrador exibe ao comprador o resultado da operação.
    API->>Backend: 9. O Mercado Pago pode enviar notificações via Webhook com atualizações do status do pagamento.
    Backend->>Navegador: 10. Se aplicável, o comprador é notificado sobre a atualização do pagamento.
</pre>

Para avançar com a configuração de pagamentos com cartão de débito e/ou crédito via _Card Payment Brick_, siga os passos abaixo.

> NOTE
>
> Lembre-se: antes de configurar os meios de pagamento, escolha o modo em que irá processar as suas transações. A definição do modo de processamento, seja **manual ou automático**, será realizada no momento da criação da order, por meio do parâmetro `processing_mode`. Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model).
:::AccordionComponent{title="Adicionar formulário de pagamento" pill="client-side"} 
Para poder receber pagamentos, é necessário que você adicione no _frontend_ um formulário que permita capturar os dados do pagador de maneira segura e possibilite a criptografia do cartão. 

Essa inclusão deve ser feita por meio do _Card Payment Brick_, que oferece um formulário otimizado com temas variados e inclui os campos necessários para pagamentos com cartões.

Para adicionar o _Card Payment Brick_, primeiro realize sua **configuração e inicialização** a partir do _frontend_, como mostram os exemplos a seguir.

[[[
```javascript
const renderCardPaymentBrick = async (bricksBuilder) => {
  const settings = {
    initialization: {
      amount: 100.99, // valor total a ser pago
    },
    callbacks: {
      onReady: () => {
        /*
         Callback chamado quando o Brick estiver pronto.
         Aqui podem ser ocultos loadings do site, por exemplo.
       */
      },
      onSubmit: (formData, additionalData) => {
        // callback chamado ao clicar no botão de envio de dados
        return new Promise((resolve, reject) => {
          const submitData = {
            type: "online",
            total_amount: String(formData.transaction_amount), // deve ser uma string com formato 00.00
            external_reference: "ext_ref_1234", // identificador da origem da transação.
            processing_mode: "automatic",
            transactions: {
              payments: [
                {
                  amount: String(formData.transaction_amount), // deve ser uma string com formato 00.00 
                  payment_method: {
                    id: formData.payment_method_id,
                    type: additionalData.paymentTypeId,
                    token: formData.token,
                    installments: formData.installments,
                  },
                },
              ],
            },
            payer: {
              email: formData.payer.email,
              identification: formData.payer.identification,
            },
          };

          fetch("/process_order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(submitData),
          })
            .then((response) => response.json())
            .then((response) => {
              // receber o resultado do pagamento
              resolve();
            })
            .catch((error) => {
              // lidar com a resposta de erro ao tentar criar o pagamento 
              reject();
            });
        });
      },
      onError: (error) => {
        // callback chamado para todos os casos de erro do Brick 
        console.error(error);
      },
    },
  };
  window.cardPaymentBrickController = await bricksBuilder.create(
    "cardPayment",
    "cardPaymentBrick_container",
    settings
  );
};
renderCardPaymentBrick(bricksBuilder);
```
``` react-jsx
const initialization = {
  amount: 100.99,
};
const onSubmit = async (formData) => {
  // callback chamado ao clicar no botão de envio de dados 
  return new Promise((resolve, reject) => {
    const submitData = {
        type: "online",
        total_amount: String(formData.transaction_amount), // deve ser uma string com formato 00.00
        external_reference: "ext_ref_1234", // identificador da origem da transação. 
        processing_mode: "automatic",
        transactions: {
          payments: [
            {
              amount: String(formData.transaction_amount), // deve ser uma string com formato 00.00
              payment_method: {
                id: formData.payment_method_id,
                type: "credit_card", // deve ser “credit_card” ou “debit_card” ,
                token: formData.token,
                installments: formData.installments,
              },
            },
          ],
        },
        payer: {
          email: formData.payer.email,
          identification: formData.payer.identification,
        },
      };
    fetch("/process_order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submitData),
    })
      .then((response) => response.json())
      .then((response) => {
        // receber o resultado do pagamento
        resolve();
      })
      .catch((error) => {
        // Tratamento da resposta de erro ao tentar criar o pagamento 
        reject();
      });
  });
};
const onError = async (error) => {
  // callback chamado para todos os casos de erro do Brick
  console.log(error);
};
const onReady = async () => {
  /*
        Callback chamado quando o Brick estiver pronto.
        Aqui podem ser ocultos loadings do site, por exemplo.
      */
};
```
]]]

O _callback_ `onSubmit` do Brick obterá os dados mínimos necessários para a criação de um pagamento. Uma das informações retornadas é o `CardToken`, que representa de forma segura os dados do cartão. Esse _token_ pode ser usado somente uma vez e expira dentro de 7 dias.

Além das informações mínimas, recomendamos incluir detalhes adicionais ou que possam facilitar o reconhecimento da compra por parte do comprador, aumentando assim a taxa de aprovação dos pagamentos. Consulte nossa [Referência de API](/developers/pt/reference/orders/online-payments/create/post) para conhecer em detalhe todos os parâmetros a serem enviados ao criar um pagamento, incluindo aqueles que podem melhorar sua taxa de aprovação, e verifique quais você deseja incluir nesta etapa. 

Em seguida, adicione os campos relevantes ao objeto enviado, que são retornados na resposta do _callback_.

> WARNING
>
> Sempre que o usuário sair da tela onde algum Brick é exibido, é necessário destruir a instância atual com o comando `window.cardPaymentBrickController.unmount()`. Ao entrar novamente, uma nova instância deve ser gerada.
Por fim, realize a **renderização** do Brick utilizando um dos exemplos abaixo

[[[
```html
<div id="cardPaymentBrick_container"></div> // O id deve corresponder ao valor enviado no método create() na etapa anterior
```
``` react-jsx
import { CardPayment } from '@mercadopago/sdk-react';
<CardPayment
   initialization={initialization}
   onSubmit={onSubmit}
   onReady={onReady}
   onError={onError}
/>
```
]]]

Como resultado, a renderização do Brick ficará semelhante à imagem abaixo.

![cardform](api-orders/card-form-mlb-pt.png)

Para avançar para a etapa de envio do pagamento, será necessário que seu _backend_ possa receber as informações do formulário criado, junto com o _token_ resultante da criptografia do cartão. Para isso, recomendamos disponibilizar um endpoint */Process_order* que receba os dados coletados pelo Brick após a ação de _submit_.

> NOTE
>
> Para configurar as parcelas exibidas no _frontend_, consulte a seção de [Configurar parcelamento](/developers/pt/docs/checkout-bricks/card-payment-brick/advanced-features/configure-installments) do _Card Payment Brick_. Caso deseje configurar parcelamento sem juros, acesse a [documentação do Support Center](/developers/pt/support/oferecer-parcelas-sem-acrescimo-para-compradores_454).

:::

:::AccordionComponent{title="Enviar pagamento" pill="server-side"} 
O envio do pagamento deve ser realizado mediante a criação de uma order que contenha a transação de pagamento associada.

Para isso, envie um **POST** com seu :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."} e os parâmetros requeridos listados abaixo para o endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/pt/reference/orders/online-payments/create/post"} e execute a requisição.

```curl
curl -X POST \
    'https://api.mercadopago.com/v1/orders'\
    -H 'Content-Type: application/json' \
       -H 'X-Idempotency-Key: {{SOME_UNIQUE_VALUE}}' \
       -H 'Authorization: Bearer {{YOUR_ACCESS_TOKEN}}' \
    -d '{
    "type": "online",
    "processing_mode": "automatic",
    "total_amount": "200.00",
    "external_reference": "ext_ref_1234",
    "payer": {
        "email": "test@testuser.com"
    },
    "transactions": {
        "payments": [
            {
                "amount": "200.00",
                "payment_method": {
                    "id": "master",
                    "type": "credit_card",
                    "token": "1223123",
                    "installments": 1
                }
            }
        ]
    }
}'
```

Veja na tabela abaixo as descrições dos parâmetros que possuem alguma particularidade importante de ser destacada.

| Atributo | Tipo | Descrição | Obrigatoriedade |
|---|---|---|---|
| `Authorization` | _Header_ | Faz referência à sua chave privada, o :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."}. | Obrigatório |
| `X-Idempotency-Key` | _Header_ | Chave de idempotência. Essa chave garante que cada solicitação seja processada apenas uma vez, evitando duplicidades. Use um valor exclusivo no `header` da requisição, como um UUID V4 ou uma _string_ aleatória. | Obrigatório |
| `processing_mode` | _Body. String_ | Modo de processamento da order. Os valores possíveis são: <br><br> - `automatic`: para criar e processar a ordem em modo automático. <br><br> - `manual`: para criar a order e processá-la posteriormente. <br><br> Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model). | Obrigatório |
| `total_amount` | _Body. String_ | Valor total da transação. | Obrigatório |
| `transaction.payments.payment_method.id` | _Body. String_ | Identificador do meio de pagamento. **Neste caso, é a bandeira de cada cartão**. Você pode consultar a lista completa de identificadores disponíveis enviando uma requisição ao endpoint [Obter meios de pagamento](/developers/pt/reference/payment_methods/_payment_methods/get). | Obrigatório |
| `transaction.payments.payment_method.type` | _Body. String_ | Tipo de meio de pagamento. Para pagamentos com cartão de crédito, deve ser `credit_card`, e para pagamentos com cartão de débito, deve ser `debit_card`. | Obrigatório |

> SUCCESS_MESSAGE
>
> Para conhecer em detalhe todos os parâmetros enviados nesta requisição, consulte nossa [Referência de API](/developers/pt/reference/orders/online-payments/create/post). Além disso, caso receba um erro ao enviar o pagamento, consulte nossa [lista de erros](/developers/pt/docs/checkout-api-orders/payment-management/integration-errors).

Em caso de sucesso, a resposta será semelhante ao exemplo abaixo.

```json
{
  "id": "ORD01JS2V6CM8KJ0EC4H502TGK1WP",
  "type": "online",
  "processing_mode": "automatic",
  "external_reference": "ext_ref_1234",
  "total_amount": "200.00",
  "total_paid_amount": "200.00",
  "country_code": "BRA",
  "user_id": "2021490138",
  "status": "processed",
  "status_detail": "accredited",
  "capture_mode": "automatic_async",
  "created_date": "2025-04-17T21:41:33.96Z",
  "last_updated_date": "2025-04-17T21:41:35.144Z",
  "integration_data": {
    "application_id": "874202490252970"
  },
  "transactions": {
    "payments": [
      {
        "id": "PAY01JS2V6CM8KJ0EC4H504R7YE34",
        "amount": "200.00",
        "paid_amount": "200.00",
        "reference_id": "0002yjis6j",
        "status": "processed",
        "status_detail": "accredited",
        "payment_method": {
          "id": "elo",
          "type": "credit_card",
          "token": "519ada5ac7431ef6ce24ac19c38f6768",
          "installments": 1
        }
      }
    ]
  }
}
```

> WARNING
>
> Em caso de ter criado a order em modo manual, lembre-se de que o processamento do pagamento requer uma etapa adicional, que é a chamada à :TagComponent{tag="API" text="Processar order " href="/developers/pt/reference/orders/online/process-order/post"}. Adicionalmente, é possível realizar uma reserva e captura de valores. Dirija-se à seção [Reservar, capturar e cancelar valores](/developers/pt/docs/checkout-api-orders/payment-management/reserve-capture-cancel) para mais informações.
Uma vez criada a order e o pagamento, você pode consultar os estados possíveis dirigindo-se às seções [Status da order](/developers/pt/docs/checkout-api-orders/payment-management/status/order-status) e [Status da transação](/developers/pt/docs/checkout-api-orders/payment-management/status/transaction-status), respectivamente.

:::

::::

::::TabComponent{title="Core Methods (Web)"} 
Na integração via _Core Methods_ para websites, o desenvolvedor fica a cargo de definir a forma como as informações necessárias para completar o pagamento serão buscadas, incluindo as informações sobre o tipo de documento e sobre o cartão (emissor e parcelas). Com isso, possui total flexibilidade na construção da experiência do fluxo de checkout, diferentemente da integração via _Card Payment Brick_, onde a busca pelas informações é feita automaticamente e a interface é pré-estabelecida.

Confira abaixo o diagrama que ilustra o processo de pagamento via cartão utilizando _Core Methods_.
<pre class="mermaid">
  sequenceDiagram
      participant Cliente as Navegador do cliente
      participant Frontend as Frontend do vendedor
      participant MPjs as MercadoPago.js
      participant Backend as Back-end do vendedor
      participant API as API Mercado Pago
      Cliente->>Frontend: 1.1 Acessa o site para pagar
      Frontend->>MPjs: 1.2 new MercadoPago(PUBLIC_KEY)
      Frontend->>MPjs: 1.3 getIdentificationTypes()
      MPjs-->>Frontend: 1.4 identificationTypes
      Frontend->>Cliente: 1.5 Mostra formulário de pagamento
      Cliente->>Frontend: 2.1 Insere os 6 primeiros números do cartão
      Frontend->>MPjs: 2.2 getPaymentMethods(OPTIONS)
      MPjs-->>Frontend: 2.3 paymentMethods
      Frontend->>MPjs: 2.4 getIssuers(OPTIONS)
      MPjs-->>Frontend: 2.5 issuers
      Frontend->>Cliente: 2.6 Mostrar emissores disponíveis
      Frontend->>MPjs: 2.6 getInstallments(OPTIONS)
      MPjs-->>Frontend: 2.7 installments
      Frontend->>Cliente: 2.8 Mostrar meio de pagamento e parcelas disponíveis
      Cliente->>Frontend: 3.1 Envio do formulário completo
      Frontend->>MPjs: 3.2 createCardToken(OPTIONS)
      MPjs-->>Frontend: 3.3 cardToken
      Frontend->>Backend: 3.4 POST/payment
      Backend->>API: 3.5 POST /v1/payments
      API-->>Backend: 3.6 Estado do pagamento
      Backend-->>Frontend: 3.7 Estado do pagamento
      Frontend->>Cliente: 3.8 Mostrar resultado
</pre>

Para avançar com a configuração de pagamentos com cartão de débito e/ou crédito via _Core Methods_, siga os passos abaixo.

> NOTE
>
> Lembre-se: antes de configurar os meios de pagamento, escolha o modo em que irá processar as suas transações. A definição do modo de processamento, seja **manual ou automático**, será realizada no momento da criação da order, por meio do parâmetro `processing_mode`. Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model).
:::AccordionComponent{title="Adicionar formulário de pagamento" pill="client-side"} 
A captura dos dados do cartão (número do cartão, código de segurança e data de validade) é feita através de um formulário de pagamento que permite obter e validar as informações necessárias para processar o pagamento.

Para obter esses dados e processar os pagamentos, insira o `HTML` abaixo diretamente no projeto.

[[[
```html

  <style>
    #form-checkout {
      display: flex;
      flex-direction: column;
      max-width: 600px;
    }
    .container {
      height: 18px;
      display: inline-block;
      border: 1px solid rgb(118, 118, 118);
      border-radius: 2px;
      padding: 1px 2px;
    }
  </style>
  <form id="form-checkout" action="/process_payment" method="POST">
    <div id="form-checkout__cardNumber" class="container"></div>
    <div id="form-checkout__expirationDate" class="container"></div>
    <div id="form-checkout__securityCode" class="container"></div>
    <input type="text" id="form-checkout__cardholderName" placeholder="Titular do cartão" />
    <select id="form-checkout__issuer" name="issuer">
      <option value="" disabled selected>Banco emissor</option>
    </select>
    <select id="form-checkout__installments" name="installments">
      <option value="" disabled selected>Parcelas</option>
    </select>
    <select id="form-checkout__identificationType" name="identificationType">
      <option value="" disabled selected>Tipo de documento</option>
    </select>
    <input type="text" id="form-checkout__identificationNumber" name="identificationNumber" placeholder="Número do documento" />
    <input type="email" id="form-checkout__email" name="email" placeholder="E-mail" />

    <input id="token" name="token" type="hidden">
    <input id="paymentMethodId" name="paymentMethodId" type="hidden">
    <input id="transactionAmount" name="transactionAmount" type="hidden" value="100">
    <input id="description" name="description" type="hidden" value="Nome do Produto">

    <button type="submit" id="form-checkout__submit">Pagar</button>
  </form>
```
]]]

:::

:::AccordionComponent{title="Inicializar campos de cartão" pill="client-side"} 
Após adicionar o formulário de pagamento, é necessário inicializar os campos de cartão (número do cartão, data de validade e código de segurança) que deverão ser preenchidos ao iniciar o fluxo de pagamento.

Ao finalizar a inicialização dos campos, as &lt;div&gt; conterão os iframes com os inputs onde serão inseridos os dados PCI.

[[[
```javascript

    const cardNumberElement = mp.fields.create('cardNumber', {
      placeholder: "Número do cartão"
    }).mount('form-checkout__cardNumber');
    const expirationDateElement = mp.fields.create('expirationDate', {
      placeholder: "MM/YY",
    }).mount('form-checkout__expirationDate');
    const securityCodeElement = mp.fields.create('securityCode', {
      placeholder: "Código de segurança"
    }).mount('form-checkout__securityCode');
```
]]]

::: 

:::AccordionComponent{title="Obter tipos de documento" pill="client-side"}
Após configurar a credencial, adicionar o formulário de pagamento e inicializar os campos de cartão, é preciso obter os tipos de documento que farão parte do preenchimento do formulário para pagamento.

Incluindo o elemento do tipo `select` com o id: `form-checkout__identificationType` que está no formulário, será possível preencher automaticamente as opções disponíveis quando chamar a função abaixo.

[[[
```javascript

    (async function getIdentificationTypes() {
      try {
        const identificationTypes = await mp.getIdentificationTypes();
        const identificationTypeElement = document.getElementById('form-checkout__identificationType');

        createSelectOptions(identificationTypeElement, identificationTypes);
      } catch (e) {
        return console.error('Error getting identificationTypes: ', e);
      }
    })();

    function createSelectOptions(elem, options, labelsAndKeys = { label: "name", value: "id" }) {
      const { label, value } = labelsAndKeys;

      elem.options.length = 0;

      const tempOptions = document.createDocumentFragment();

      options.forEach(option => {
        const optValue = option[value];
        const optLabel = option[label];

        const opt = document.createElement('option');
        opt.value = optValue;
        opt.textContent = optLabel;

        tempOptions.appendChild(opt);
      });

      elem.appendChild(tempOptions);
    }
```
]]]

:::

:::AccordionComponent{title="Obter métodos de pagamento do cartão" pill="client-side"} 
Nesta etapa ocorre a validação dos dados dos compradores no momento em que realizam o preenchimento dos campos necessários para efetuar o pagamento. Para que seja possível identificar o meio de pagamento utilizado pelo comprador, insira o código abaixo diretamente no projeto. 

[[[
```javascript

    const paymentMethodElement = document.getElementById('paymentMethodId');
    const issuerElement = document.getElementById('form-checkout__issuer');
    const installmentsElement = document.getElementById('form-checkout__installments');

    const issuerPlaceholder = "Banco emissor";
    const installmentsPlaceholder = "Parcelas";

    let currentBin;
    cardNumberElement.on('binChange', async (data) => {
      const { bin } = data;
      try {
        if (!bin && paymentMethodElement.value) {
          clearSelectsAndSetPlaceholders();
          paymentMethodElement.value = "";
        }

        if (bin && bin !== currentBin) {
          const { results } = await mp.getPaymentMethods({ bin });
          const paymentMethod = results[0];

          paymentMethodElement.value = paymentMethod.id;
          updatePCIFieldsSettings(paymentMethod);
          updateIssuer(paymentMethod, bin);
          updateInstallments(paymentMethod, bin);
        }

        currentBin = bin;
      } catch (e) {
        console.error('error getting payment methods: ', e)
      }
    });

    function clearSelectsAndSetPlaceholders() {
      clearHTMLSelectChildrenFrom(issuerElement);
      createSelectElementPlaceholder(issuerElement, issuerPlaceholder);

      clearHTMLSelectChildrenFrom(installmentsElement);
      createSelectElementPlaceholder(installmentsElement, installmentsPlaceholder);
    }

    function clearHTMLSelectChildrenFrom(element) {
      const currOptions = [...element.children];
      currOptions.forEach(child => child.remove());
    }

    function createSelectElementPlaceholder(element, placeholder) {
      const optionElement = document.createElement('option');
      optionElement.textContent = placeholder;
      optionElement.setAttribute('selected', "");
      optionElement.setAttribute('disabled', "");

      element.appendChild(optionElement);
    }

    // Esta etapa melhora as validações cardNumber e securityCode
    function updatePCIFieldsSettings(paymentMethod) {
      const { settings } = paymentMethod;

      const cardNumberSettings = settings[0].card_number;
      cardNumberElement.update({
        settings: cardNumberSettings
      });

      const securityCodeSettings = settings[0].security_code;
      securityCodeElement.update({
        settings: securityCodeSettings
      });
    }
```
]]]

::: 

:::AccordionComponent{title="Obter banco emissor" pill="client-side"} 
Durante o preenchimento do formulário de pagamento, é possível identificar o banco emissor do cartão, evitando conflitos de processamento de dados entre os diferentes emissores. Além disso, é a partir dessa identificação que as opções de parcelamento são exibidas.

O banco emissor é obtido através do parâmetro `issuer_id`. Para obtê-lo, utilize o Javascript abaixo.

[[[
```javascript

    async function updateIssuer(paymentMethod, bin) {
      const { additional_info_needed, issuer } = paymentMethod;
      let issuerOptions = [issuer];

      if (additional_info_needed.includes('issuer_id')) {
        issuerOptions = await getIssuers(paymentMethod, bin);
      }

      createSelectOptions(issuerElement, issuerOptions);
    }

    async function getIssuers(paymentMethod, bin) {
      try {
        const { id: paymentMethodId } = paymentMethod;
        return await mp.getIssuers({ paymentMethodId, bin });
      } catch (e) {
        console.error('error getting issuers: ', e)
      }
    };
```
]]]

::: 

:::AccordionComponent{title="Obter quantidade de parcelas" pill="client-side"} 
Um dos campos obrigatórios que compõem o formulário de pagamento é a **quantidade de parcelas**. Para ativá-lo e exibir as parcelas disponíveis no ato do pagamento, utilize a função abaixo. 

[[[
```javascript

    async function updateInstallments(paymentMethod, bin) {
      try {
        const installments = await mp.getInstallments({
          amount: document.getElementById('transactionAmount').value,
          bin,
          paymentTypeId: 'credit_card'
        });
        const installmentOptions = installments[0].payer_costs;
        const installmentOptionsKeys = { label: 'recommended_message', value: 'installments' };
        createSelectOptions(installmentsElement, installmentOptions, installmentOptionsKeys);
      } catch (error) {
        console.error('error getting installments: ', e)
      }
    }
```
]]]

> NOTE
>
> Caso deseje configurar parcelamento sem juros, acesse a [documentação do Support Center](/developers/pt/support/oferecer-parcelas-sem-acrescimo-para-compradores_454).

::: 

:::AccordionComponent{title="Criar token do cartão" pill="client-side"} 
O _token_ do cartão é criado a partir das próprias informações do cartão, aumentando a segurança durante o fluxo de pagamento. Além disso, uma vez que o _token_ é utilizado em determinada compra, ele é descartado, sendo necessário a criação de um novo para futuras compras. Para criar o _token_ do cartão, utilize a função abaixo.

> NOTE
>
> Importante
>
> O método `createCardToken` retorna um _token_ com a representação segura dos dados do cartão. Tomaremos o _token_ ID da resposta e salvaremos em um input oculto chamado `token` para depois enviar o formulário aos servidores. Além disso, tenha em conta que o **_token_ tem uma validade de 7 dias** e só pode ser usado **uma única vez**.
[[[
```javascript

    const formElement = document.getElementById('form-checkout');
    formElement.addEventListener('submit', createCardToken);

    async function createCardToken(event) {
      try {
        const tokenElement = document.getElementById('token');
        if (!tokenElement.value) {
          event.preventDefault();
          const token = await mp.fields.createCardToken({
            cardholderName: document.getElementById('form-checkout__cardholderName').value,
            identificationType: document.getElementById('form-checkout__identificationType').value,
            identificationNumber: document.getElementById('form-checkout__identificationNumber').value,
          });
          tokenElement.value = token.id;
          formElement.requestSubmit();
        }
      } catch (e) {
        console.error('error creating card token: ', e)
      }
    }
```
]]]

:::

:::AccordionComponent{title="Enviar pagamento" pill="server-side"} 
O envio do pagamento deve ser realizado mediante a criação de uma order que contenha a transação de pagamento associada.

> NOTE
>
> A criação de um pagamento pode ocorrer de forma assíncrona em uma order. Nesse cenário, a order fica com o status de processando e sem informações. Recomendamos configurar as [notificações do tópico Order](/developers/pt/docs/checkout-api-orders/notifications) para receber atualizações sobre a mudança de status, incluindo os dados atualizados da order. Alternativamente, você pode optar por enviar um **GET** ao endpoint :TagComponent{tag="API" text="/v1/orders/{id}" href="/developers/pt/reference/orders/online-payments/get-order/get"} para buscar esses dados atualizados.

Para isso, envie um **POST** com seu :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."} e os parâmetros requeridos listados abaixo para o endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/pt/reference/orders/online-payments/create/post"} e execute a requisição.

```curl
curl -X POST \
    'https://api.mercadopago.com/v1/orders'\
    -H 'Content-Type: application/json' \
       -H 'X-Idempotency-Key: {{SOME_UNIQUE_VALUE}}' \
       -H 'Authorization: Bearer {{YOUR_ACCESS_TOKEN}}' \
    -d '{
    "type": "online",
    "processing_mode": "automatic",
    "total_amount": "200.00",
    "external_reference": "ext_ref_1234",
    "payer": {
        "email": "{{EMAIL}}"
    },
    "transactions": {
        "payments": [
            {
                "amount": "200.00",
                "payment_method": {
                    "id": "master",
                    "type": "credit_card",
                    "token": "1223123",
                    "installments": 1
                }
            }
        ]
    }
}'
```

Veja na tabela abaixo as descrições dos parâmetros que são obrigatórios na requisição e daqueles que, embora sejam opcionais, possuem alguma particularidade importante de ser destacada.

| Atributo | Tipo | Descrição | Obrigatório/Opcional |
|---|---|---|---|
| `Authorization` | _Header_ | Faz referência à sua chave privada, o :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."}. | Obrigatório |
| `X-Idempotency-Key` | _Header_ | Llave de idempotencia. Chave de idempotência. Essa chave garante que cada solicitação seja processada apenas uma vez, evitando duplicidades. Use um valor exclusivo no `header` da requisição, como um UUID V4 ou uma _string_ aleatória. | Obrigatório |
| `processing_mode` | _Body. String_ | Modo de processamento da order. Os valores possíveis são: <br><br> - `automatic`: para criar e processar a ordem em modo automático. <br><br> - `manual`: para criar a order e processá-la posteriormente. <br><br> Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model). | Obrigatório |
| `total_amount` | _Body. String_ | Valor total da transação. | Obrigatório |
| `transaction.payments.payment_method.id` | _Body. String_ | Identificador do meio de pagamento. **Neste caso, é a bandeira de cada cartão**. Você pode consultar a lista completa de identificadores disponíveis enviando uma requisição ao endpoint [Obter meios de pagamento](/developers/pt/reference/payment_methods/_payment_methods/get). | Obrigatório |
| `transaction.payments.payment_method.type` | _Body. String_ | Tipo de método de pagamento. Para pagamentos com cartão de crédito, deve ser `credit_card`, e para pagamentos com cartão de débito, deve ser `debit_card`. | Obrigatório |

> SUCCESS_MESSAGE
>
> Para conhecer em detalhe todos os parâmetros enviados nesta requisição, consulte nossa [Referência de API](/developers/pt/reference/orders/online-payments/create/post). Além disso, caso receba um erro ao enviar o pagamento, consulte nossa [lista de erros](/developers/pt/docs/checkout-api-orders/payment-management/integration-errors).
Em caso de sucesso, a resposta será semelhante ao exemplo abaixo.

```json
{
  "id": "ORD01J6TC8BYRR0T4ZKY0QR39WGYE",
  "processing_mode": "automatic",
  "external_reference": "ext_ref_1234",
  "marketplace": "NONE",
  "total_amount": "200.00",
  "country_code": "BRA",
  "user_id": "1245621468",
  "created_date": "2024-09-02T22:04:01.880469Z",
  "last_updated_date": "2024-09-02T22:04:04.429289Z",
  "type": "online",
  "status": "action_required",
  "status_detail": "waiting_payment",
  "capture_mode": "automatic",
  "integration_data": {
    "application_id": "4599991948843755"
  },
  "transactions": {
    "payments": [
      {
        "id": "PAY01J6TC8BYRR0T4ZKY0QRTZ0E24",
        "reference_id": "22dvqmsbq8c",
        "amount": "200.00",
        "status": "action_required",
        "status_detail": "waiting_payment",
        "payment_method": {
          "id": "boleto",
          "type": "ticket",
          "ticket_url": "https://www.mercadopago.com.ar/payments/86797024510/ticket?caller_id=1870026883&payment_method_id=rapipago&payment_id=86797024510&payment_method_reference_id=6004835002&hash=0331521a-9ddb-44a2-851c-65f77d8d394e",
          "barcode_content": "3335008800000000006004835002100020000242462010",
          "reference": "1234567890",
          "verification_code": "1234567890",
          "financial_institution": "bolbradesco",
          "digitable_line": "23793380296060054351030006333303799140000020000"
        }
      }
    ]
  }
}
```

> WARNING
>
> Se você criou a order em modo manual, lembre-se de que é necessário realizar uma chamada ao endpoint :TagComponent{tag="API" text="Processar order " href="/developers/pt/reference/orders/online/process-order/post"} para efetivar o pagamento. Também é possível reservar e capturar valores. Para mais detalhes, acesse [Reservar, capturar e cancelar valores](/developers/pt/docs/checkout-api-orders/payment-management/reserve-capture-cancel).  
Após criar a order e o pagamento, consulte os possíveis status nas seções [Status da order](/developers/pt/docs/checkout-api-orders/payment-management/status/order-status) e [Status da transação](/developers/pt/docs/checkout-api-orders/payment-management/status/transaction-status).

:::

::::

::::TabComponent{title="Core Methods (iOS)"}
Na integração via _Core Methods_ para aplicações iOS, o desenvolvedor fica a cargo de definir a forma como as informações necessárias para completar o pagamento serão buscadas, incluindo as informações sobre o tipo de documento e sobre o cartão (emissor e parcelas). 

## Requisitos

Antes de começar a integração, certifique-se de que seu projeto atende aos seguintes requisitos:

| Requisitos | Descrição |
|-|-|
| iOS | Versão 13 ou superior |
| XCode | Versão 16 ou superior |
| Swift | Versão 5.5 ou superior |
| Public Key | A :toolTipComponent[Public Key]{content="Chave pública que é utilizada no _frontend_ para acessar informações e criptografar dados. Você pode acessá-la através de *Suas integrações > Dados da integração > Produção > Credenciais de produção*."} está diretamente vinculada à :toolTipComponent[aplicação]{link="/developers/pt/docs/checkout-api-orders/resources/application-details" linkText="Dados da integração" content="Entidade registrada no Mercado Pago que atua como um identificador para gerenciar suas integrações. Para mais informações, acesse o link abaixo."} que você criou, por isso cada uma delas é única para cada integração. |

## Configurar campos seguros

Os campos seguros são componentes desenvolvidos para garantir a privacidade e a proteção dos dados sensíveis digitados pelo comprador. Em total conformidade com os :toolTipComponent[padrões PCI]{content="Conjunto de regras de segurança que buscam proteger os dados dos cartões de pagamento contra fraudes e vazamentos de dados."} esses campos asseguram que o aplicativo nunca tenha acesso direto às informações inseridas, que são transmitidas com segurança apenas para a criação de tokens e transações.

Todas as interações com esses campos ocorrem por meio de _callbacks_, permitindo a captura de eventos relevantes sem expor os dados do usuário. Os métodos descritos a seguir utilizam instâncias desses campos seguros, por isso é essencial que estejam devidamente configurados na interface do checkout antes de utilizá-los.

Cada componente notifica o aplicativo sempre que houver alteração de valor, sem expor os dados digitados, e também informa o resultado da validação do campo conforme as regras do PCI e do cartão.

> NOTE
>
> Os dados digitados nos campos seguros nunca ficam disponíveis para a aplicação integradora. Eles são encaminhados em segurança apenas para a criação de _tokens_ e transações.

Veja na tabela abaixo os componentes disponíveis. Para mais detalhes sobre a configuração, consulte a referência correspondente no GitHub.

| Nome do Componente        | Referência no GitHub                                                                                                                 | Descrição                                              |
|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| CardNumberTextField      | [Referência](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/cardnumbertextfield)                              | Campo seguro para digitar o número do cartão.          |
| ExpirationDateTextField  | [Referência](https://mercadopago.github.io/sdk-ios/0.1.0/documentation/coremethods/expirationdatetextfield)                          | Campo seguro para digitar a data de validade do cartão.|
| SecurityTextField        | [Referência](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/securitycodetextfield)                            | Campo seguro para digitar o código de segurança (CVV). |

## _Core Methods_

Os **_Core Methods_** são essenciais para a construção de um fluxo de checkout integrado ao Mercado Pago. Eles utilizam informações capturadas pelos [**campos seguros**](#bookmark_campos_seguros) e viabilizam a execução das principais operações de pagamento.

Cada método deve ser utilizado de acordo com as necessidades do seu fluxo de pagamento. Para utilizá-los, comece criando uma instância do _Core Methods_ na sua classe utilizando o seguinte código Swift: `private let coreMethods = CoreMethods()`.

Dessa forma, você poderá utilizar qualquer um dos métodos listados abaixo:

:::AccordionComponent{title="Obter meios de pagamento" pill="client-side"} 

O método **Obter meios de pagamento** retorna a lista de meios de pagamento disponíveis a partir do BIN do cartão informado, considerando as regras e instituições financeiras válidas para o país configurado. Por meio desse método, é possível identificar a bandeira do cartão, definir corretamente os próximos passos do checkout e validar a aceitação do cartão.

```swift
Task {
   // Se deve usar o bin retornado do OnBinChanged do CardNumberTextfield
    let paymentMethod = try await coreMethods.paymentMethods(
        bin: "5024111"
    )
}
```

Os parâmetros estão listados na tabela abaixo.

| Parâmetro | Tipo   | Descrição                                                                                                  | Obrigatório | 
|-----------|--------|------------------------------------------------------------------------------------------------------------|-------------| 
| bin       | String | Os 8 primeiros dígitos do cartão de crédito, obtidos pelo _callback_ `onBinChange` do `CardNumberTextField`. | Obrigatório         | 

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/paymentmethods(bin:mode:)). 

:::

:::AccordionComponent{title="Obter condições de parcelamento" pill="client-side"} 

O método **Obter condições de parcelamento** realiza a busca por todas as opções de parcelamento disponíveis para um determinado cartão e valor de transação. Ele considera as regras do emissor, do método de pagamento e do valor da compra, retornando todas as opções válidas de parcelamento, incluindo quantidade de parcelas, juros, valor de cada parcela, valor total, entre outros.

A chamada ao método `getInstallments` deve ser feita para todos os tipos de cartão (débito e crédito) para verificar se o pagamento pode ser concluído por esse meio.

Confira o exemplo de utilização a seguir:

```swift
Task {
   // Se deve usar o bin retornado do OnBinChanged do CardNumberTextfield
    let installments = try await coreMethods.installments(
        bin: "12345678",
        amount: "100"
    )
}
```
> NOTE
>
> Utilize as informações do `Installment` selecionado para exibir ao comprador todos os detalhes do valor e do parcelamento da compra, antes da finalização do pagamento.

Os parâmetros estão listados na tabela abaixo.

| Parâmetro       | Tipo             | Descrição                                              | Obrigatoriedade | 
| - | - | - | - |
| `bin`           | String           | 8 dígitos do cartão de crédito.                       | Obrigatório | 
| `amount`        | Long             | Valor da ordem.                                        | Obrigatório | 

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/paymentmethods(bin:mode:)). 
:::

:::AccordionComponent{title="Obter emissor do cartão" pill="client-side"} 

Para determinados meios de pagamento e bandeiras, o Mercado Pago exige a identificação do emissor do cartão (_issuer_). Este método retorna a lista de emissores de cartão disponíveis para o BIN informado, permitindo ao usuário selecionar o emissor adequado quando necessário.

```swift
Task {
   // Se deve usar o bin retornado do OnBinChanged do CardNumberTextfield
   // Se deve usar o paymentMethodId retornado da request de PaymentMethods
    let issuer = try await coreMethods.issuers(
        bin: 12345678,
        paymentMethodID: paymentMethodId
    )
}
```

Os parâmetros estão listados na tabela abaixo.

| Parâmetro         | Tipo    | Descrição                                                                                              | Obrigatoriedade | 
|-------------------|---------|--------------------------------------------------------------------------------------------------------| - | 
| bin               | String  | Os 8 primeiros dígitos do cartão de crédito, obtidos pelo _callback_ `onBinChange` do `CardNumberTextField`. | Obrigatório | 
| paymentMethodId   | String  | ID do método de pagamento, obtido no resultado do método `PaymentMethods`.                 | Obrigatório | 

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/issuers(bin:paymentmethodid:)). 
:::

:::AccordionComponent{title="Obter tipos de documento" pill="client-side"} 
O Mercado Pago exige a validação de um documento de identificação do titular do cartão. Utilize este método para receber todos os tipos de documentos aceitos, como CPF, RG, DNI, para o país configurado na integração.

```swift
Task {
    let documents = await self.coreMethods.identificationTypes()
}
```

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/identificationtypes()). 
:::

:::AccordionComponent{title="Criar token do cartão" pill="client-side"} 

Este método é responsável por gerar um _token_ temporário a partir dos dados do cartão informado. O _token_ gerado é obrigatório para a realização da transação de pagamento via API do Mercado Pago, pois substitui os dados sensíveis do cartão, garantindo maior segurança no processo. 

> WARNING
>
> A chamada deste método utiliza uma instância dos [campos seguros](#bookmark_campos_seguros) previamente configurados na interface do checkout. Portanto, certifique-se de que os campos seguros estejam devidamente implementados e configurados antes de utilizar o método `generateCardToken`.

### Criar um _token_ para um novo cartão

Para gerar um _token_ para um novo cartão de forma segura, utilize a classe que protege os dados digitados e passe-a para o método `generateCardToken`. Antes de executar o método, verifique se todos os campos obrigatórios estão preenchidos corretamente.

```swift
Task {
    let token = try await coreMethods.createToken(
        cardNumber: cardNumber,
        expirationDate: expirationDate,
        securityCode: securityCode,
        documentType: IdentificationType(name: "CPF"),
        documentNumber: "1234567891",
        cardHolderName: "APRO"
    )
    print("Token response => \(response.token)")
}
```

Os parâmetros estão listados na tabela abaixo.

| Parâmetro             | Tipo                    | Descrição                                    | Obrigatoriedade |
| - | - | - | - |
| `cardNumberState`     | [CardNumberTextField](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/cardnumbertextfield)   | Classe do campo de número de cartão.      | Obrigatório |
| `expirationDateState` | [ExpirationDateTextfield](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/expirationdatetextfield) | Classe do campo de expiração do cartão.      | Obrigatório |
| `securityCodeState`   | [SecurityCodeTextField](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/securitycodetextfield) | Classe do campo de código de segurança do cartão.   | Obrigatório |
| `documentType`      | [IdentificationType](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/identificationtype) | Tipo de documento que está sendo enviado| Opcional    |
| `documentNumber`    | String             | Número do documento                     | Opcional    |
| `cardHolderName`    | String             | Nome completo do detentor do cartão     | Obrigatório         |

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/createtoken(cardnumber:expirationdate:securitycode:documenttype:documentnumber:cardholdername:)). 

### Criar um _token_ para um cartão existente

Nas transações com o Mercado Pago, os dados dos cartões registrados pelo comprador são armazenados de forma segura e não são acessíveis a partir do seu _backend_. Apenas o `ID` do cartão é fornecido à aplicação, que você deverá utilizar para gerar um _token_ temporário. Isso protege as informações sensíveis, pois apenas o `ID` é manipulado, enquanto o número do cartão, CVV e data de vencimento não são expostos e permanecem seguros. 

```swift
func generateTokenByCardID() {
    Task {
        let response = try await coreMethods.createToken(
            cardID: "123",
            securityCode: securityCodeField
        )
        print("Token response => \(response.token)")
    }
}
```

Os parâmetros estão listados na tabela abaixo.

| Parâmetro      | Tipo                    | Descrição                                      | Obrigatoriedade |
| - | - | - | - |
| `cardID`       | String                  | ID do cartão existente gerado.     | Obrigatório |
| `securityCode` | [SecurityCodeTextField](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/securitycodetextfield) | Classe do campo de código de segurança do cartão. | Opcional |

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-ios/latest/documentation/coremethods/coremethods/createtoken(cardid:expirationdate:securitycode:)). 
:::

:::AccordionComponent{title="Realizar pagamento" pill="server-side"} 
O envio do pagamento deve ser realizado mediante a criação de uma order que contenha a transação de pagamento associada.

Para isso, envie um **POST** com seu :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."} e os parâmetros requeridos listados abaixo para o endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/pt/reference/orders/online-payments/create/post"} e execute a requisição.

```curl
curl -X POST \
    'https://api.mercadopago.com/v1/orders'\
    -H 'Content-Type: application/json' \
       -H 'X-Idempotency-Key: {{SOME_UNIQUE_VALUE}}' \
       -H 'Authorization: Bearer {{YOUR_ACCESS_TOKEN}}' \
    -d '{
    "type": "online",
    "processing_mode": "automatic",
    "total_amount": "200.00",
    "external_reference": "ext_ref_1234",
    "payer": {
        "email": "test@testuser.com"
    },
    "transactions": {
        "payments": [
            {
                "amount": "200.00",
                "payment_method": {
                    "id": "master",
                    "type": "credit_card",
                    "token": "1223123",
                    "installments": 1
                }
            }
        ]
    }
}'
```

Veja na tabela abaixo as descrições dos parâmetros.

| Atributo | Tipo | Descrição | Obrigatoriedade |
|---|---|---|---|
| `Authorization` | _Header_ | Faz referência à sua chave privada, o :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."}. | Obrigatório |
| `X-Idempotency-Key` | _Header_ | Chave de idempotência. Essa chave garante que cada solicitação seja processada apenas uma vez, evitando duplicidades. Use um valor exclusivo no `header` da requisição, como um UUID V4 ou uma _string_ aleatória. | Obrigatório |
| `processing_mode` | _Body. String_ | Modo de processamento da order. Os valores possíveis são: <br><br> - `automatic`: para criar e processar a ordem em modo automático. <br><br> - `manual`: para criar a order e processá-la posteriormente. <br><br> Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model). | Obrigatório |
| `total_amount` | _Body. String_ | Valor total da transação. | Obrigatório |
| `transaction.payments.payment_method.id` | _Body. String_ | Identificador do meio de pagamento. **Neste caso, é a bandeira de cada cartão**. Você pode consultar a lista completa de identificadores disponíveis enviando uma requisição ao endpoint [Obter meios de pagamento](/developers/pt/reference/payment_methods/_payment_methods/get). | Obrigatório |
| `transaction.payments.payment_method.type` | _Body. String_ | Tipo de meio de pagamento. Para pagamentos com cartão de crédito, deve ser `credit_card`, e para pagamentos com cartão de débito, deve ser `debit_card`. | Obrigatório |

> SUCCESS_MESSAGE
>
> Para conhecer em detalhe todos os parâmetros enviados nesta requisição, consulte nossa [Referência de API](/developers/pt/reference/orders/online-payments/create/post). Além disso, caso receba um erro ao enviar o pagamento, consulte nossa [lista de erros](/developers/pt/docs/checkout-api-orders/payment-management/integration-errors).

Em caso de sucesso, a resposta será semelhante ao exemplo abaixo.

```json
{
  "id": "ORD01JS2V6CM8KJ0EC4H502TGK1WP",
  "type": "online",
  "processing_mode": "automatic",
  "external_reference": "ext_ref_1234",
  "total_amount": "200.00",
  "total_paid_amount": "200.00",
  "country_code": "BRA",
  "user_id": "2021490138",
  "status": "processed",
  "status_detail": "accredited",
  "capture_mode": "automatic_async",
  "created_date": "2025-04-17T21:41:33.96Z",
  "last_updated_date": "2025-04-17T21:41:35.144Z",
  "integration_data": {
    "application_id": "874202490252970"
  },
  "transactions": {
    "payments": [
      {
        "id": "PAY01JS2V6CM8KJ0EC4H504R7YE34",
        "amount": "200.00",
        "paid_amount": "200.00",
        "reference_id": "0002yjis6j",
        "status": "processed",
        "status_detail": "accredited",
        "payment_method": {
          "id": "master",
          "type": "credit_card",
          "token": "519ada5ac7431ef6ce24ac19c38f6768",
          "installments": 1
        }
      }
    ]
  }
}

```

> WARNING
>
> Caso tenha criado a order em modo manual, o pagamento exigirá uma chamada adicional a :TagComponent{tag="API" text="Processar order" href="/developers/pt/reference/orders/online/process-order/post"}. Também é possível realizar uma reserva e captura de valores. Para mais detalhes, consulte a [documentação Reservar, capturar e cancelar valores](/developers/pt/docs/checkout-api-orders/payment-management/reserve-capture-cancel).

Uma vez criada a order e o pagamento, você pode consultar os estados possíveis nas seções [Status da order](/developers/pt/docs/checkout-api-orders/payment-management/status/order-status) e [Status da transação](/developers/pt/docs/checkout-api-orders/payment-management/status/transaction-status), respectivamente.
:::

## Exemplos e referências

Para aprofundar o entendimento sobre a implementação e utilização do SDK, consulte o [repositório no GitHub](https://github.com/mercadopago/sdk-ios).

O repositório inclui um módulo de exemplo completo, demonstrando a integração dos campos seguros e dos _Core Methods_, além de apresentar um fluxo de checkout integrado e seguro.

::::

::::TabComponent{title="Core Methods (Android)"}
Na integração via _Core Methods_ para aplicações Android, o desenvolvedor fica a cargo de definir a forma como as informações necessárias para completar o pagamento serão buscadas, incluindo as informações sobre o tipo de documento e sobre o cartão (emissor e parcelas).

## Requisitos

Antes de começar a integração, certifique-se de que seu projeto atende aos seguintes requisitos:

| Requisitos | Descrição |
|-|-|
| SDK | Versão 23 ou superior |
| Jetpack Compose BoM | Versão 2024.12.01 ou superior |
| Kotlin | Versão 2.0 ou superior |
| Public Key | A :toolTipComponent[Public Key]{content="Chave pública que é utilizada no _frontend_ para acessar informações e criptografar dados. Você pode acessá-la através de *Suas integrações > Dados da integração > Produção > Credenciais de produção*."} está diretamente vinculada à :toolTipComponent[aplicação]{link="/developers/pt/docs/checkout-api-orders/resources/application-details" linkText="Dados da integração" content="Entidade registrada no Mercado Pago que atua como um identificador para gerenciar suas integrações. Para mais informações, acesse o link abaixo."} que você criou, por isso cada uma delas é única para cada integração. |

## Configurar campos seguros

Os campos seguros são componentes desenvolvidos para garantir a privacidade e a proteção dos dados sensíveis digitados pelo comprador. Em total conformidade com os :toolTipComponent[padrões PCI]{content="Conjunto de regras de segurança que buscam proteger os dados dos cartões de pagamento contra fraudes e vazamentos de dados."}, esses campos asseguram que o aplicativo nunca tenha acesso direto às informações inseridas, que são transmitidas com segurança apenas para a criação de tokens e transações.

Todas as interações com esses campos ocorrem por meio de _callbacks_, permitindo a captura de eventos relevantes sem expor os dados do usuário. Os métodos descritos a seguir utilizam instâncias desses campos seguros, por isso é essencial que estejam devidamente configurados na interface do checkout antes de utilizá-los.

Cada componente notifica a aplicação integradora quando ocorre alteração no valor, sem expor os dados digitados, e também informa o resultado da validação do campo conforme as regras do PCI e do cartão.

> NOTE
>
> Os dados digitados nos campos seguros nunca ficam disponíveis para a aplicação integradora. Eles são encaminhados em segurança apenas para a criação de _tokens_ e transações.

Na tabela abaixo, você encontrará o detalhamento dos componentes disponíveis. Para mais informações sobre a configuração, consulte a referência correspondente a cada um deles no GitHub.

| Nome do componente        |  Referência no GitHub                                                                                                                    | Descrição                                              |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|
| CardNumberTextField      | [Referência](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.cardnumber/index.html)    | Campo seguro para digitar o número do cartão.          |
| ExpirationDateTextField  | [Referência](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.expirationdate/index.html) | Campo seguro para digitar a data de validade do cartão.|
| SecurityTextField        | [Referência](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.securitycode/index.html)       | Campo seguro para digitar o código de segurança (CVV). |

## _Core Methods_

Os **_Core Methods_** são essenciais para a construção de um fluxo de checkout integrado ao Mercado Pago. Eles utilizam informações capturadas pelos [**campos seguros**](#bookmark_campos_seguros) e viabilizam a execução das principais operações de pagamento.

Cada método deve ser utilizado de acordo com as necessidades do seu fluxo de pagamento. Para utilizá-los, comece criando uma instância do _Core Methods_ na sua classe utilizando o seguinte código Kotlin: `val coreMethods = MercadoPagoSDK.getInstance().coreMethods`.

Dessa forma, você poderá utilizar qualquer um dos métodos listados abaixo:

:::AccordionComponent{title="Obter meios de pagamento" pill="client-side"} 
O método **Obter meios de pagamento** retorna a lista de meios de pagamento disponíveis a partir do BIN do cartão informado, considerando as regras e instituições financeiras válidas para o país configurado. Por meio desse método, é possível identificar a bandeira do cartão, definir corretamente os próximos passos do checkout e validar a aceitação do cartão.

```kotlin
val coreMethods = MercadoPagoSDK.getInstance().coreMethods
coroutineScope {
   // Se deve usar o bin retornado do CardNumberTextFieldEvent.OnBinChanged
   val result = coreMethods.getPaymentMethods(bin = bin)
   when (result) {
       is Result.Success -> {
           // Sucesso da chamada
           print("Sucesso de request: ${result.data}")
       }

       is Result.Error -> {
           when (result.error) {
               is ResultError.Request -> {
                   // Erro da chamada do tipo request
                   print("Erro de request: ${result.error}")
               }

               is ResultError.Validation -> {
                   // Erro da chamada do tipo validation
                   print("Erro de validação: ${result.error}")
               }
           }
       }
   }
}
```

Os parâmetros estão listados na tabela abaixo.

| Parâmetro | Tipo   | Descrição                                                                                              | Obrigatoriedade |
|-----------|--------|-------------------------------------------------------------------------------------------------------|-------------|
| bin       | String | Os 8 primeiros dígitos do cartão de crédito, obtidos pelo _callback_ `onBinChange` do `CardNumberTextFieldEvent`. | Obrigatório         |

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/get-payment-methods.html).

:::

:::AccordionComponent{title="Obter condições de parcelamento" pill="client-side"}

O método **Obter condições de parcelamento** realiza a busca por todas as opções de parcelamento disponíveis para um determinado cartão e valor de transação. Ele considera as regras do emissor, do método de pagamento e do valor da compra, retornando todas as opções válidas de parcelamento, incluindo quantidade de parcelas, juros, valor de cada parcela, valor total, entre outros.

A chamada ao método `getInstallments` deve ser feita para todos os tipos de cartão (débito e crédito) para verificar se o pagamento pode ser concluído por esse meio.

```kotlin
val coreMethods = MercadoPagoSDK.getInstance().coreMethods
coroutineScope { 
   // Se deve usar o bin retornado do CardNumberTextFieldEvent.OnBinChanged
   val result = coreMethods.getInstallments(
       bin = bin,
       amount = BigDecimal("100.00")
   )
   when (result) {
       is Result.Success -> {
           // Sucesso da chamada
           print("Sucesso de request: ${result.data}")
       }

       is Result.Error -> {
           when (result.error) {
               is ResultError.Request -> {
                   // Erro da chamada do tipo request
                   print("Erro de request: ${result.error}")
               }

               is ResultError.Validation -> {
                   // Erro da chamada do tipo validation
                   print("Erro de validação: ${result.error}")
               }
           }
       }
   }
}
```

> NOTE
>
> Utilize as informações do `Installment` para exibir ao comprador todos os detalhes do valor e do parcelamento da compra, antes da finalização do pagamento.

Os parâmetros estão listados na tabela abaixo.

| Parâmetro      | Tipo             | Descrição                                                                                                 | Obrigatoriedade                  |
|----------------|------------------|-----------------------------------------------------------------------------------------------------------|------------------------------|
| bin            | String           | Os 8 primeiros dígitos do cartão de crédito, obtidos pelo _callback_ `onBinChange` do `CardNumberTextFieldEvent`. | Obrigatório                          |
| amount         | Long             | Valor total da transação.                                                                                 | Obrigatório                          |

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/get-installments.html).

:::

:::AccordionComponent{title="Obter emissor do cartão" pill="client-side"}

Em determinados meios de pagamento e bandeiras, o Mercado Pago exige a identificação do emissor do cartão (_issuer_). Este método retorna a lista de emissores disponíveis para o BIN informado, permitindo ao usuário selecionar o emissor correto quando necessário.

```kotlin
val coreMethods = MercadoPagoSDK.getInstance().coreMethods
coroutineScope {
   // Se deve usar o bin retornado do CardNumberTextFieldEvent.OnBinChanged
   // Se deve usar o paymentMethodId retornado da request de PaymentMethods
   val result = coreMethods.getCardIssuers(
       bin = bin,
       paymentMethodId = paymentMethodId,
   )
   when (result) {
       is Result.Success -> {
           // Sucesso da chamada
           print("Sucesso de request: ${result.data}")
       }

       is Result.Error -> {
           when (result.error) {
               is ResultError.Request -> {
                   // Erro da chamada do tipo request
                   print("Erro de request: ${result.error}")
               }

               is ResultError.Validation -> {
                   // Erro da chamada do tipo validation
                   print("Erro de validação: ${result.error}")
               }
           }
       }
   }
}
```

Os parâmetros estão listados na tabela abaixo.

| Parâmetro         | Tipo   | Descrição                                                                                                             | Obrigatório |
|-------------------|--------|---------------------------------------------------------------------------------------------------------------------|-------------|
| bin               | String | Os 8 primeiros dígitos do cartão de crédito, obtidos pelo _callback_ `onBinChange` do `CardNumberTextFieldEvent`.     | Obrigatório         |
| paymentMethodId   | String | ID do método de pagamento, normalmente obtido a partir do resultado do método `PaymentMethods`.                      | Obrigatório         |

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/get-card-issuers.html).

:::

:::AccordionComponent{title="Obter tipos de documento" pill="client-side"}

O Mercado Pago exige a validação de um documento de identificação do titular do cartão. Utilize este método para receber todos os tipos de documentos aceitos, como CPF, RG, DNI, para o país configurado na integração.

```kotlin
val coreMethods = MercadoPagoSDK.getInstance().coreMethods
coroutineScope {
   val result = coreMethods.getIdentificationTypes()
   when (result) {
       is Result.Success -> {
           // Sucesso da chamada
           print("Sucesso de request: ${result.data}")
       }

       is Result.Error -> {
           when (result.error) {
               is ResultError.Request -> {
                   // Erro da chamada do tipo request
                   print("Erro de request: ${result.error}")
               }

               is ResultError.Validation -> {
                   // Erro da chamada do tipo validation
                   print("Erro de validação: ${result.error}")
               }
           }
       }
   }
}

```

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/get-identification-types.html).
:::

:::AccordionComponent{title="Criar token do cartão" pill="client-side"}

Este método é responsável por gerar um _token_ temporário a partir dos dados do cartão informado. O _token_ gerado é obrigatório para a realização da transação de pagamento via API do Mercado Pago, pois substitui os dados sensíveis do cartão, garantindo maior segurança no processo.

> WARNING
>
> A chamada deste método utiliza uma instância dos [campos seguros](#bookmark_campos_seguros) previamente configurados na interface do checkout. Portanto, certifique-se de que os campos seguros estejam devidamente implementados e configurados antes de utilizar o método `generateCardToken`.

### Criar um _token_ para um novo cartão

Para gerar um _token_ para um novo cartão de forma segura, utilize a classe que protege os dados digitados e passe-a para o método `generateCardToken`. Antes de executar o método, verifique se todos os campos obrigatórios estão preenchidos corretamente.

```kotlin
val coreMethods = MercadoPagoSDK.getInstance().coreMethods
coroutineScope {
   val result = coreMethods.generateCardToken(
      cardNumberState = cardNumberPCIFieldState,
      expirationDateState = expirationDatePCIFieldState,
      securityCodeState = securityCodePCIFieldState,
      buyerIdentification = BuyerIdentification(
          name = "APRO",
          number = "12345678909",
          type = "CPF"
      )
   )
   when (result) {
       is Result.Success -> {
           // Sucesso da chamada
           print("Sucesso de request: ${result.data}")
       }

       is Result.Error -> {
           when (result.error) {
               is ResultError.Request -> {
                   // Erro da chamada do tipo request
                   print("Erro de request: ${result.error}")
               }

               is ResultError.Validation -> {
                   // Erro da chamada do tipo validation
                   print("Erro de validação: ${result.error}")
               }
           }
       }
   }
}  
```

Os parâmetros estão listados na tabela abaixo.

| Parâmetro             | Tipo                    | Descrição                                    | Obrigatoriedade |
| - | - | - | - |
| `cardNumberState`     | [PCIFieldState](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Estado do campo de número de cartão.      | Obrigatório |
| `expirationDateState` | [PCIFieldState](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Estado do campo de expiração do cartão.      | Obrigatório |
| `securityCodeState`   | [PCIFieldState](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Estado do campo de código de segurança do cartão.   | Obrigatório |
| `buyerIdentification` | [BuyerIdentification](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.model/-buyer-identification/index.html?query=data%20class%20BuyerIdentification(val%20name:%20String?,%20val%20number:%20String?,%20val%20type:%20String?)) | Classe de identificação do comprador. | Obrigatório |

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/generate-card-token.html). 

### Criar um _token_ para um cartão existente

Nas transações com o Mercado Pago, os dados dos cartões registrados pelo comprador são armazenados de forma segura e não são acessíveis a partir do seu _backend_. Apenas o `ID` do cartão é fornecido à aplicação, que você deverá utilizar para gerar um _token_ temporário. Isso protege as informações sensíveis, pois apenas o `ID` é manipulado, enquanto o número do cartão, CVV e data de vencimento não são expostos e permanecem seguros. 

```kotlin
val coreMethods = MercadoPagoSDK.getInstance().coreMethods
coroutineScope {
   val result = coreMethods.generateCardToken(
      cardId = cardId,
      expirationDateState = expirationDatePCIFieldState,
      securityCodeState = securityCodePCIFieldState,
      buyerIdentification = BuyerIdentification(
          name = "APRO",
          number = "12345678909",
          type = "CPF"
      )
   )
   when (result) {
       is Result.Success -> {
           // Sucesso da chamada
           print("Sucesso de request: ${result.data}")
       }

       is Result.Error -> {
           when (result.error) {
               is ResultError.Request -> {
                   // Erro da chamada do tipo request
                   print("Erro de request: ${result.error}")
               }

               is ResultError.Validation -> {
                   // Erro da chamada do tipo validation
                   print("Erro de validação: ${result.error}")
               }
           }
       }
   }
}
```

Os parâmetros estão listados na tabela abaixo.

| Parâmetro      | Tipo                    | Descrição                                      | Obrigatoriedade |
| - | - | - | - |
| `cardId`       | String                  | ID do cartão existente gerado.     | Obrigatório |
| `securityCodeState` | [PCIFieldState](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Estado do campo de código de segurança do cartão | Obrigatório |
| `expirationDateState` | [PCIFieldStat](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.ui.components.textfield.pcitextfield/-p-c-i-field-state/index.html?query=class%20PCIFieldState) | Estado do campo de expiração do cartão | Opcional |
| `buyerIdentification` | [BuyerIdentification](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.model/-buyer-identification/index.html?query=data%20class%20BuyerIdentification(val%20name:%20String?,%20val%20number:%20String?,%20val%20type:%20String?)) | Classe de identificação do comprador | Obrigatório |

Para mais informações sobre a resposta da chamada, consulte a [documentação do método no GitHub](https://mercadopago.github.io/sdk-android/core-methods/com.mercadopago.sdk.android.coremethods.domain.interactor/-core-methods/generate-card-token.html). 
:::

:::AccordionComponent{title="Realizar pagmento" pill="server-side"} 
O envio do pagamento deve ser realizado mediante a criação de uma order que contenha a transação de pagamento associada.

Para isso, envie um **POST** com seu :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."} e os parâmetros requeridos listados abaixo para o endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/pt/reference/orders/online-payments/create/post"} e execute a requisição.

```curl
curl -X POST \
    'https://api.mercadopago.com/v1/orders'\
    -H 'Content-Type: application/json' \
       -H 'X-Idempotency-Key: {{SOME_UNIQUE_VALUE}}' \
       -H 'Authorization: Bearer {{YOUR_ACCESS_TOKEN}}' \
    -d '{
    "type": "online",
    "processing_mode": "automatic",
    "total_amount": "200.00",
    "external_reference": "ext_ref_1234",
    "payer": {
        "email": "test@testuser.com"
    },
    "transactions": {
        "payments": [
            {
                "amount": "200.00",
                "payment_method": {
                    "id": "master",
                    "type": "credit_card",
                    "token": "1223123",
                    "installments": 1
                }
            }
        ]
    }
}'
```

Veja na tabela abaixo as descrições dos parâmetros que possuem alguma particularidade importante de ser destacada.

| Atributo | Tipo | Descrição | Obrigatório/Opcional |
|---|---|---|---|
| `Authorization` | _Header_ | Faz referência à sua chave privada, o :toolTipComponent[Access Token]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."}. | Obrigatório |
| `X-Idempotency-Key` | _Header_ | Chave de idempotência. Essa chave garante que cada solicitação seja processada apenas uma vez, evitando duplicidades. Use um valor exclusivo no `header` da requisição, como um UUID V4 ou uma _string_ aleatória. | Obrigatório |
| `processing_mode` | _Body. String_ | Modo de processamento da order. Os valores possíveis são: <br><br> - `automatic`: para criar e processar a ordem em modo automático. <br><br> - `manual`: para criar a order e processá-la posteriormente. <br><br> Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model). | Obrigatório |
| `total_amount` | _Body. String_ | Valor total da transação. | Obrigatório |
| `transaction.payments.payment_method.id` | _Body. String_ | Identificador do meio de pagamento. **Neste caso, é a bandeira de cada cartão**. Você pode consultar a lista completa de identificadores disponíveis enviando uma requisição ao endpoint [Obter meios de pagamento](/developers/pt/reference/payment_methods/_payment_methods/get). | Obrigatório |
| `transaction.payments.payment_method.type` | _Body. String_ | Tipo de meio de pagamento. Para pagamentos com cartão de crédito, deve ser `credit_card`, e para pagamentos com cartão de débito, deve ser `debit_card`. | Obrigatório |

> SUCCESS_MESSAGE
>
> Para conhecer em detalhe todos os parâmetros enviados nesta requisição, consulte nossa [Referência de API](/developers/pt/reference/orders/online-payments/create/post). Além disso, caso receba um erro ao enviar o pagamento, consulte nossa [lista de erros](/developers/pt/docs/checkout-api-orders/payment-management/integration-errors).

Em caso de sucesso, a resposta será semelhante ao exemplo abaixo.

```json
{
  "id": "ORD01JS2V6CM8KJ0EC4H502TGK1WP",
  "type": "online",
  "processing_mode": "automatic",
  "external_reference": "ext_ref_1234",
  "total_amount": "200.00",
  "total_paid_amount": "200.00",
  "country_code": "BRA",
  "user_id": "2021490138",
  "status": "processed",
  "status_detail": "accredited",
  "capture_mode": "automatic_async",
  "created_date": "2025-04-17T21:41:33.96Z",
  "last_updated_date": "2025-04-17T21:41:35.144Z",
  "integration_data": {
    "application_id": "874202490252970"
  },
  "transactions": {
    "payments": [
      {
        "id": "PAY01JS2V6CM8KJ0EC4H504R7YE34",
        "amount": "200.00",
        "paid_amount": "200.00",
        "reference_id": "0002yjis6j",
        "status": "processed",
        "status_detail": "accredited",
        "payment_method": {
          "id": "master",
          "type": "credit_card",
          "token": "519ada5ac7431ef6ce24ac19c38f6768",
          "installments": 1
        }
      }
    ]
  }
}

```

> WARNING
>
> Em caso de ter criado a order em modo manual, lembre-se de que o processamento do pagamento requer uma etapa adicional, que é a chamada à :TagComponent{tag="API" text="Processar order " href="/developers/pt/reference/orders/online/process-order/post"}. Adicionalmente, é possível realizar uma reserva e captura de valores. Dirija-se à seção [Reservar, capturar e cancelar valores](/developers/pt/docs/checkout-api-orders/payment-management/reserve-capture-cancel) para mais informações.
Uma vez criada a order e o pagamento, você pode consultar os estados possíveis dirigindo-se às seções [Status da order](/developers/pt/docs/checkout-api-orders/payment-management/status/order-status) e [Status da transação](/developers/pt/docs/checkout-api-orders/payment-management/status/transaction-status), respectivamente.
:::

## Exemplos e referências

Para aprofundar o entendimento sobre a implementação e utilização do SDK, consulte o [repositório no GitHub](https://github.com/mercadopago/sdk-android).

O repositório inclui um módulo de exemplo completo, demonstrando a integração dos campos seguros e dos _Core Methods_, além de apresentar um fluxo de checkout integrado e seguro. 
::::

:::::
