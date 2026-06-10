# Backend de producao

O checkout precisa ser publicado junto com este backend Flask. Hospedagem
somente estatica nao processa pagamentos com seguranca.

## Variaveis de ambiente

Configure no painel da hospedagem:

```text
MP_PUBLIC_KEY=public_key_de_producao
MP_ACCESS_TOKEN=access_token_de_producao
CHECKOUT_SIGNING_KEY=valor_aleatorio_longo
MELHOR_ENVIO_TOKEN=token_do_melhor_envio
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=json_da_conta_de_servico_codificado_em_base64
GOOGLE_SHEETS_SPREADSHEET_ID=id_da_planilha
GOOGLE_SHEETS_RANGE=Pedidos!A:S
```

Nao envie o arquivo `server/.env` ao servidor publico. Em producao, prefira
o gerenciador de segredos ou as variaveis de ambiente da hospedagem.

A planilha deve ser compartilhada como editora com o `client_email` da conta
de servico. A aba `Pedidos` precisa existir. Se a primeira linha estiver vazia,
o backend cria os cabecalhos automaticamente.

## Execucao

Instale as dependencias:

```bash
pip install -r server/requirements.txt
```

Em uma hospedagem Linux com Gunicorn:

```bash
gunicorn --chdir server app:app
```

O dominio deve apontar para esse processo Flask e usar HTTPS. O backend serve
os arquivos do site, bloqueando `server/`, `documentation/` e arquivos ocultos.

## Vercel

O arquivo `pyproject.toml` da raiz define `server.app:app` como entrypoint.
Antes do deploy, cadastre todas as variaveis acima em:

`Project Settings > Environment Variables`

Cadastre-as para Production e Preview. O arquivo `server/.env` local nao e
enviado ao Vercel.
