# Integrar meios de pagamento

Com o  Checkout Transparente,  você pode escolher quais meios de pagamento deseja disponibilizar nas lojas online.

O processo de integração se baseia na **configuração individual desses meios de pagamento dentro do ambiente comum previamente estabelecido**, o que facilita a experiência de integração e permite um maior nível de personalização.

Se desejar, é possível obter uma lista detalhada com todos os meios de pagamento disponíveis para integração enviando um **GET** com seu :toolTipComponent[Access Token de teste]{content="Chave privada da aplicação criada no Mercado Pago e que é utilizada no _backend_. Você pode acessá-la através de *Suas integrações > Dados da integração > Testes > Credenciais de teste*."} ao endpoint :TagComponent{tag="API" text="/v1/payment_methods" href="/developers/pt/reference/payment_methods/_payment_methods/get"} utilizando um dos códigos abaixo. 

[[[
```php
<?php
  use MercadoPago\MercadoPagoConfig;

  MercadoPagoConfig::setAccessToken("ENV_ACCESS_TOKEN");

  $client = new PaymentMethodClient();
  $payment_method = $client->get();

?>
```
```node
import { MercadoPagoConfig, PaymentMethods } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: 'access_token' });
const paymentMethods = new PaymentMethods(client);

paymentMethods.get().then((result) => console.log(result))
  .catch((error) => console.log(error));
```
```java
MercadoPagoConfig.setAccessToken("ENV_ACCESS_TOKEN");

PaymentMethodClient client = new PaymentMethodClient();
client.list();

```
```ruby
require 'mercadopago'
sdk = Mercadopago::SDK.new('ENV_ACCESS_TOKEN')

payment_methods_response = sdk.payment_methods.get()
payment_methods = payment_methods_response[:response]

```
```csharp
using MercadoPago.Client.PaymentMethod;
using MercadoPago.Config;
using MercadoPago.Resource;
using MercadoPago.Resource.PaymentMethod;

MercadoPagoConfig.AccessToken = "ENV_ACCESS_TOKEN";

var client = new PaymentMethodClient();
ResourcesList<PaymentMethod> paymentMethods = await client.ListAsync();

```
```python
import mercadopago
sdk = mercadopago.SDK("ACCESS_TOKEN")

payment_methods_response = sdk.payment_methods().list_all()
payment_methods = payment_methods_response["response"]
```
```curl
curl -X GET \
    -H 'accept: application/json' \
    -H 'content-type: application/json' \
    -H 'Authorization: Bearer ENV_ACCESS_TOKEN' \
    'https://api.mercadopago.com/v1/payment_methods' \
```
]]]

Com essas informações, você já pode escolher quais meios de pagamento deseja oferecer e continuar com sua integração.

> NOTE
>
> Lembre-se: antes de configurar os meios de pagamento, escolha o modo em que irá processar as suas transações. A definição do modo de processamento, seja **manual ou automático**, será realizada no momento da criação da order, por meio do parâmetro `processing_mode`. Para mais informações, acesse a seção [Modelo de integração](/developers/pt/docs/checkout-api-orders/integration-model).

---
future_product_avaible:
 - card_avaible: true
 - card_icon: Card
 - card_title: Cartões
 - card_description: Receba pagamentos com cartões de crédito ou débito (virtual Caixa) de forma segura através de um formulário de pagamento dentro do checkout.
 - card_button: /developers/pt/docs/checkout-api-orders/payment-integration/cards
 - card_buttonDescription: Como integrar
 - card_pillText: DISPONÍVEL
 - card_linkAvailable: false
 - card_linkProof: 
 - card_linkProofDescription:
 - card_avaible: true
 - card_icon: QRCode
 - card_title: Pix
 - card_description: Receba pagamentos eletrônicos instantâneos, oferecendo aos seus clientes a possibilidade de pagar a partir de um código QR ou um código de pagamento.
 - card_button: /developers/pt/docs/checkout-api-orders/payment-integration/pix
 - card_buttonDescription: Como integrar
 - card_pillText: DISPONÍVEL
 - card_linkAvailable: false
 - card_linkProof: 
 - card_linkProofDescription:
 - card_avaible: true
 - card_icon: Boleto
 - card_title: Boleto
 - card_description: Receba em sua conta os pagamentos que o cliente realizar através de um boleto bancário.
 - card_button: /developers/pt/docs/checkout-api-orders/payment-integration/boleto
 - card_buttonDescription: Como integrar
 - card_pillText: DISPONÍVEL
 - card_linkAvailable: false
 - card_linkProof: 
 - card_linkProofDescription:
---

