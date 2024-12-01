// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const { themes } = require('prism-react-renderer');
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Transeptor',
  tagline: 'Lightweight, blazing-fast, modular ERC-4337 TypeScript bundler built with functional programming', 
  favicon: 'img/brand/logo-2.png',
  staticDirectories: ['public', 'static'],

  // Set the production url of your site here
  url: 'https://transeptor.transeptorlabs.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'transeptorlabs', // Usually your GitHub org/user name.
  projectName: 'transeptor-bundler.github.io', // Usually your repo name.
  trailingSlash: false,
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: "docs",
          breadcrumbs: true,
          sidebarPath: require.resolve('./sidebar.js'),
          editUrl: "https://github.com/transeptorlabs/transeptor-bundler/edit/website/",
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        gtag: {
          trackingID: 'G-Z83JPJWN1C',
          anonymizeIP: true,
        },
      }),
      
    ],
  ],

  plugins: [
    // [
      // "@docusaurus/plugin-content-docs",
      // ({
      //   id: "learn",
      //   path: "learn",
      //   routeBasePath: "learn",
      //   editUrl: "https://github.com/transeptorlabs/transeptor-docs/edit/main/",
      //   sidebarPath: require.resolve("./learn-sidebar.js"),
      //   breadcrumbs: true,
      // }),
    // ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/transeptor.jpg',
      metadata: [{name: 'keywords', content: 'bundler, erc-4337, account abstraction, smart contract account, ethereum'}],
      navbar: {
        title: 'Transeptor Labs',
        logo: {
          alt: 'Transeptor labs Logo',
          src: 'img/brand/logo-2.png',
        },
        items: [
          {
            to:'docs',
            position: 'right',
            label: 'Docs',
          },
          {
            label: 'Join our Community',
            href: 'https://t.me/+eUGda3KIND4zMjRh',
            position: 'right',
          },
          {
            href: 'https://github.com/transeptorlabs/transeptor-bundler',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Learn',
            items: [
              {
                label: 'Docs',
                to: 'docs',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Telegram',
                href: 'https://t.me/+eUGda3KIND4zMjRh',
              },
              {
                label: 'X',
                href: 'https://x.com/transeptorlabs',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/transeptorlabs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Transeptor Labs`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      // algolia: {
      //   // The application ID provided by Algolia
      //   appId: 'KUQD34DBOI',
  
      //   // Public API key: it is safe to commit it
      //   apiKey: 'a2a09bea095663541c95ed34d802c8e5',
  
      //   indexName: 'transeptorlabs',
  
      //   // Optional: see doc section below
      //   contextualSearch: true,
  
      //   // Optional: Specify domains where the navigation should occur through window.location instead on history.push. Useful when our Algolia config crawls multiple documentation sites and we want to navigate with window.location.href to them.
      //   // externalUrlRegex: 'external\\.com|domain\\.com',
  
      //   // Optional: Replace parts of the item URLs from Algolia. Useful when using the same search index for multiple deployments using a different baseUrl. You can use regexp or string in the `from` param. For example: localhost:3000 vs myCompany.com/docs
      //   replaceSearchResultPathname: {
      //     from:  "/",
      //     to: process.env.DEST || "/",
      //   },
  
      //   // Optional: Algolia search parameters
      //   searchParameters: {},
  
      //   // Optional: path for search page that enabled by default (`false` to disable it)
      //   searchPagePath: 'search',
  
      //   //... other Algolia params
      // },
    }),
};

module.exports = config;
