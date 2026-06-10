# Pix

Com o  Checkout Transparente  do Mercado Pago, também é possível oferecer pagamentos instantâneos com Pix via **código QR** ou um **link de pagamento**.

> WARNING
> 
> Para oferecer pagamentos via Pix, é necessário ter as chaves Pix cadastradas. Caso ainda não tenha, [clique aqui](https://www.youtube.com/watch?v=60tApKYVnkA) para mais informações sobre como cadastrá-las.

**Pix** é um meio de pagamento eletrônico instantâneo oferecido pelo Banco Central do Brasil a pessoas físicas e jurídicas. 

Se você já [configurou seu ambiente](/developers/pt/docs/checkout-api-orders/development-environment) e quer oferecer pagamentos via Pix, siga os passos abaixo.

> NOTE
>
> Lembre-se: antes de configurar os meios de pagamento, escolha o modo em que irá processar as suas transações. A definição do modo de processamento, seja **manual ou automático**, será realizada no momento da criação da order, por meio do parâmetro `processing_mode`. Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model).

:::AccordionComponent{title="Adicionar formulário de pagamento" pill="client-side"}

Para receber pagamentos, é necessário adicionar no _frontend_ um formulário que permita capturar os dados do pagador de maneira segura.

Se você já tem um desenvolvimento que inclui um formulário de pagamento próprio, certifique-se de incluir Pix entre as opções de pagamento que deseja oferecer, conforme indicado abaixo, e continue para a etapa de [Obter tipos de documento](/developers/pt/docs/checkout-api-orders/payment-integration/pix#:~:text=client%2Dside-,Obter,-tipos%20de%20documento).

Caso ainda não tenha um formulário de pagamento, adicione o modelo abaixo ao seu projeto e inclua o identificador do Pix como opção a ser oferecida.

| Meio de pagamento | `payment_method_id`|
|:---:|:---:|
| Pix | `pix` |

```html
 <form id="form-checkout" action="/process_payment" method="post">
    <div>
      <div>
        <label for="payerFirstName">Nome</label>
        <input id="form-checkout__payerFirstName" name="payerFirstName" type="text">
      </div>
      <div>
        <label for="payerLastName">Sobrenome</label>
        <input id="form-checkout__payerLastName" name="payerLastName" type="text">
      </div>
      <div>
        <label for="email">E-mail</label>
        <input id="form-checkout__email" name="email" type="text">
      </div>
      <div>
        <label for="identificationType">Tipo de documento</label>
        <select id="form-checkout__identificationType" name="identificationType" type="text"></select>
      </div>
      <div>
        <label for="identificationNumber">Número do documento</label>
        <input id="form-checkout__identificationNumber" name="identificationNumber" type="text">
      </div>
    </div>

    <div>
      <div>
        <input type="hidden" name="transactionAmount" id="transactionAmount" value="100">
        <input type="hidden" name="description" id="description" value="Nome do Produto">
        <br>
        <button type="submit">Pagar</button>
      </div>
    </div>
  </form>
```

:::
:::AccordionComponent{title="Obter tipos de documento" pill="client-side"}

Para facilitar o preenchimento correto do formulário de pagamento, é preciso obter os tipos de documento que podem ser aceitos.

A função abaixo permite completar automaticamente as opções disponíveis. Para isso, basta incluir no formulário o elemento `select` com o `id=form-checkout__identificationType`, utilizado no exemplo da etapa anterior.

Se você já possui um desenvolvimento que contempla a obtenção de tipos de documento, como indicado a seguir, avance para a etapa de [Enviar pagamento](/developers/pt/docs/checkout-api-orders/payment-integration/pix#:~:text=server%2Dside-,Enviar,-pagamento).

Caso ainda não tenha essa função, adicione o código a seguir ao seu projeto.

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

:::
:::AccordionComponent{title="Enviar pagamento" pill="server-side"}

O envio do pagamento deve ser realizado mediante a criação de uma order que contenha a transação de pagamento associada.

> NOTE
>
> A criação de um pagamento pode ocorrer de forma assíncrona em uma order. Nesse cenário, a order fica com o status de processando e sem informações. Recomendamos configurar as [notificações do tópico Order](/developers/pt/docs/checkout-api-orders/notifications) para receber atualizações sobre a mudança de status, incluindo os dados atualizados da order. Alternativamente, você pode optar por enviar um **GET** ao endpoint [/v1/orders/{id}](/developers/pt/reference/orders/online-payments/get-order/get) para buscar esses dados atualizados.

Para isso, envie um **POST** com seu :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."} e os parâmetros requeridos listados abaixo para o endpoint :TagComponent{tag="API" text="/v1/orders" href="/developers/pt/reference/orders/online-payments/create/post"} e execute a requisição.      

```curl
curl -X POST \
    -H 'accept: application/json' \
    -H 'content-type: application/json' \
    -H 'Authorization: Bearer ENV_ACCESS_TOKEN' \
    -H 'X-Idempotency-Key: SOME_UNIQUE_VALUE' \
    'https://api.mercadopago.com/v1/orders' \
    -d '{
  "type": "online",
  "total_amount": "1000.00",
  "external_reference": "ext_ref_1234",
  "processing_mode": "automatic",
  "transactions": {
    "payments": [
      {
        "amount": "1000.00",
        "payment_method": {
          "id": "pix",
          "type": "bank_transfer"
        },
        "expiration_time": "P3Y6M4DT12H30M5S"
      }
    ]
  },
  "payer": {
    "email": "test@testuser.com"
  }
}'
```

Veja na tabela abaixo as descrições dos parâmetros que são obrigatórios na requisição e daqueles que, embora sejam opcionais, possuem alguma particularidade importante de ser destacada.

| Atributo                                          | Tipo            | Descrição                                                                                                                                                                                                                        | Obrigatoriedade |
|---------------------------------------------------|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| `Authorization`                                     | _Header_        | Faz referência à sua chave privada, o :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."}.                                                            | Obrigatório          |
| `X-Idempotency-Key`                                 | _Header_          | Chave de idempotência. Essa chave garante que cada solicitação seja processada apenas uma vez, evitando duplicidades. Use um valor exclusivo no `header` da requisição, como um UUID V4 ou uma *string* aleatória.            | Obrigatório          |
| `total_amount`                                      | _Body. String_    | Valor total da transação.                                                                                                                                                                                                       | Obrigatório             |
| `external_reference`                                 | _Body. String_    | Referência externa da order que pode ser, por exemplo, um hashcode do Banco Central, funcionando como identificador de origem da transação.                                                                                   | Obrigatório          |
| `processing_mode`                                   | _Body. String_    | Modo de processamento da order. Os valores possíveis são: <br><br> - `automatic`: para criar e processar a ordem em modo automático. <br><br> - `manual`: para criar a order e processá-la posteriormente. <br><br> Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model).                                          | Obrigatório          |
| `transaction.payments.payment_method.id`            | _Body. String_    | Identificador do meio de pagamento. Neste caso, o valor deverá ser `pix`.                                                                                                                                                      | Obrigatório          |
| `transaction.payments.payment_method.type`          | _Body. String_    | Tipo do meio de pagamento. No caso de pagamentos com Pix, o valor deverá ser `bank_transfer`.                                                                                                                                  | Obrigatório          |
| `transaction.payment.expiration_time`                                 | _Body. String_    | Permite definir a **data de vencimento** utilizando o formato de duração ISO 8601. Por padrão, a data de vencimento de pagamentos via Pix é de 24 horas, mas é possível alterá-la através deste parâmetro. A data configurada deve estar entre 30 minutos até 30 dias a partir da data de emissão do pagamento.             | Opcional             |
| `payer.email`                                       | _Body. String_    | E-mail do comprador.                                                                                                                                                                                                 | Obrigatório          |

> SUCCESS_MESSAGE
>
> Para conhecer em detalhe todos os parâmetros enviados e retornados nesta requisição, consulte nossa [Referência de API](/developers/pt/reference/orders/online-payments/create/post). Além disso, caso receba um erro ao enviar o pagamento, consulte nossa [lista de erros](/developers/pt/docs/checkout-api-orders/payment-management/integration-errors) para mais informações.

Após enviar a requisição do pagamento, a resposta trará as seguintes informações: 

```json
{
  "id": "ORD01HRYFWNYRE1MR1E60MW3X0T2P",
  "type": "online",
  "total_amount": "1000.00",
  "external_reference": "ext_ref_1234",
  "country_code": "BRA",
  "status": "action_required",
  "status_detail": "waiting_transfer",
  "capture_mode": "automatic",
  "transactions": {
    "payments": [
      {
        "id": "PAY01HRYFXQ53Q3JPEC48MYWMR0TE",
        "reference_id": "123456789",
        "status": "action_required",
        "status_detail": "waiting_transfer",
        "amount": "1000.00",
        "payment_method": {
          "id": "pix",
          "type": "bank_transfer",
          "ticket_url": "https://www.mercadopago.com.br/sandbox/payments/00000000000/ticket?caller_id=77777777777&hash=34cb0d7c-81d9-478c-92a5-767d0kakjja",
          "qr_code": "00020126580014br.gov.bcb.pix0136b76aa9c2-2ec4-4110-954e-ebfe34f05b61520400005303986540510.005802BR5912TESTPVBWOSBE6009Sao Paulo62240520mpqrinter715936942186304C3C0",
          "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAABWQAAAVkAQAAAAB79i"
        }
      }
    ]
  },
  "processing_mode": "automatic",
  "marketplace": "NONE"
}
```

Dentre os parâmetros retornados, temos os indicados na tabela abaixo.  

| Atributo                                          | Tipo          | Descrição                                                                                                                                                                                                                                               |
|---------------------------------------------------|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `transaction.payments.status`                        | _String_       | Retorna o status da transação. Neste caso, retornará `action_required` para indicar a necessidade de uma ação para concluir o processamento, ou seja, até que se realize o pagamento.                                                               |
| `transaction.payments.status_detail`                 | _String_        | Nos casos de transferência bancária, como é o caso de pagamentos com Pix, o `status_detail` obtido é aguardando (`waiting_payment`) que o usuário finalize o processo de pagamento no seu banco.                                                  |
| `transaction.payments.payment_method.ticket_url`    | _String_    | URL para o Pix renderizado, com código QR, Pix Copia e Cola e instruções de pagamento. Veja mais informações em [Disponibilizar pagamento](/developers/pt/docs/checkout-api-orders/payment-integration/pix#:~:text=client%2Dside-,Disponibilizar,-pagamento).                                                                                                   |
| `transaction.payments.payment_method.qr_code`        | _String_        | Apresenta um código alfanumérico a ser utilizado na configuração para apresentar a opção que permitirá copiar e colar o código de pagamento para pagamento do Pix. Veja mais informações em [Disponibilizar pagamento](/developers/pt/docs/checkout-api-orders/payment-integration/pix#:~:text=client%2Dside-,Disponibilizar,-pagamento).                               |
| `transaction.payments.payment_method.qr_code_base64` | _String_        | Representação em `Base64` da imagem do código QR a ser digitalizado para finalização do pagamento. Apresenta o valor que deverá utilizado na requisição para exibir o código QR do Pix. Veja mais informações em [Disponibilizar pagamento](/developers/pt/docs/checkout-api-orders/payment-integration/pix#:~:text=client%2Dside-,Disponibilizar,-pagamento).               |

> WARNING
> 
> Caso tenha criado a order em modo manual, lembre-se de que o processamento do pagamento requer uma etapa adicional, a chamada ao endpoint :TagComponent{tag="API" text="Processar order" href="/developers/pt/reference/orders/online/process-order/post"}.
:::
:::AccordionComponent{title="Disponibilizar pagamento" pill="client-side"}

Após criar a requisição do pagamento com Pix, escolha a forma com que o usuário realizará o pagamento no _frontend_, podendo ser através de um **link ou botão de pagamento** ou de um **código QR renderizado**.

Selecione a opção que mais se adequa ao seu modelo de negócio e siga as etapas descritas abaixo.

### Adicionar link ou botão

Ao optar por **adicionar um link ou botão para pagamento com Pix**, o comprador será direcionado a uma nova janela contendo todas as informações para realização do pagamento, como **código QR** ou **Pix Copia e Cola** e as suas respectivas instruções de pagamento.

Para oferecer esta opção, utilize o atributo `ticket_url`, retornado na resposta da requisição, como apresentado abaixo:

```html
<a href="https://www.mercadopago.com.br/payments/123456789/ticket?caller_id=123456&hash=123e4567-e89b-12d3-a456-426655440000" target="_blank">Pagar com Pix</a>
```

### Renderizar código QR

O código QR retornado na resposta da requisição pode ser renderizado diretamente na tela de pagamento e deve ser utilizado apenas uma vez. Além disso, é possível incluir a opção de copiar e colar o código de pagamento, permitindo a transação via _Internet Banking_.

Para isso, siga as etapas abaixo.

1. Adicione o `qr_code_base64`, [retornado na resposta da requisição](/developers/pt/docs/checkout-api-orders/payment-integration/pix#:~:text=Dentre%20os%20par%C3%A2metros%20retornados%2C%20temos%20os%20indicados%20na%20tabela%20abaixo.), para exibir o código QR.

```html
<img src={`data:image/jpeg;base64,${qr_code_base64}`}/>
```

2. Em seguida, adicione o `qr_code`, retornado na resposta da requisição, para apresentar a opção que permitirá copiar e colar o código.

```html
<label for="copiar">Copiar Hash:</label>
<input type="text" id="copiar" value={qr_code} readonly/>
```

Ao concluir essas etapas, será apresentado para o comprador no momento do pagamento o código QR renderizado junto à opção de copiar e colar o seu código de pagamento.

:::
:::AccordionComponent{title="Cancelar pagamento" pill="server-side"}

Caso deseje, você pode cancelar um pagamento criado, desde que esteja pendente ou em processamento. Ou seja, com `status=action_required`.

Além disso, recomendamos cancelar os pagamentos que não foram realizados dentro da data de vencimento estabelecida, para evitar problemas de cobrança e conciliação.

> WARNING
>
> Se passarem 30 dias após a data de vencimento estabelecida para um pagamento e este não tiver sido realizado, o Mercado Pago o considerará expirado. Nesses casos, não é possível fazer um cancelamento manual, e o status do pagamento passará a ser cancelado ou expirado.

Para obter mais informações, consulte a seção [Reembolsos e cancelamentos](/developers/pt/docs/checkout-api-payments/payment-management/refunds-cancellations).

:::