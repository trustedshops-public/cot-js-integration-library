# Community of Trust Javascript/Typescript Integration Library

![License](https://img.shields.io/github/license/trustedshops-public/cot-js-integration-library)
[![CircleCI](https://dl.circleci.com/status-badge/img/gh/trustedshops-public/cot-js-integration-library/tree/main.svg?style=shield)](https://dl.circleci.com/status-badge/redirect/gh/trustedshops-public/cot-js-integration-library/tree/main)

This library provides a comprehensive JavaScript/Typescript interface for integrating with the Community of Trust (COT) platform, facilitating seamless interactions with its services.

## Requirements

- node.js for development
- npm for package management

## Installation

To install the library, run the following command in your project directory:

```sh
npm i @trustedshops-public/cot-integration-library
```

## Usage

Here is a basic example of how to use the library:

On the backend side:

```TypeScript
import { Client } from '@trustedshops-public/cot-integration-library';

// Initialize the client with the required parameters once
const client = new Client(
    <TSID>, // Trusted Shops ID - e.g. 'X1234567890123456789012345678901'
    <CLIENT_ID>, // Client ID - e.g. 'cot-switch-X1234567890123456789012345678901'
    <CLIENT_SECRET>, // Client Secret - e.g. '1234567890123456789012345678901234567890123456789012345678901234'
    <AUTH_STORAGE_INSTANCE>, // It can be any storage option implementing AuthStorageInterface - e.g. new DatabaseAuthStorage()
    <ENV> // Environment (optional) - dev, test, or prod, defaults to prod
);

// Set the cookie handler to handle cookies everytime before a request is made and handled
client.setCookieHandler(<COOKIE_HANDLER_INSTANCE>);

// Pass the actual url which the authentication has been started from to let authentication server verify the redirect uri e.g. 'https://www.example.com/shop'
client.setRedirectUri(<REDIRECT_URI>);

// Invoke handleCallback function to handle code coming from the authentication server
await client.handleCallback(authCode);

// Get anonymous consumer data for the current user
const consumerData = await client.getAnonymousConsumerData();
```

On the frontend side, place the following code in your HTML file where you want the widget to appear:

```html
<trstd-switch tsId="X1234567890123456789012345678901"></trstd-switch>
<script type="module" src="https://widgets.trustedshops.com/switch/switch.js"></script>
```

For more detailed examples, please refer to the [`examples/`](./examples/) directory.

## Development

To get started with development, clone the repository and install the dependencies:

```sh
npm i
```

Setup the environment variables:

```sh
cp .env.example .env.local
```

and fill in the required values.

To run the tests, use the following command:

```sh
npm test
```

To build the library, use the following command:

```sh
npm run build
```

To run local development server, use the following command:

```sh
npm run dev
```

## Contributing

Contributions are welcome! Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file for guidelines.

## License

This library is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

TODO

## Versioning

This project adheres to [Semantic Versioning](https://semver.org/). For the versions available, see the [tags on this repository](
    https://github.com/trustedshops-public/cot-js-integration-library/tags
).
