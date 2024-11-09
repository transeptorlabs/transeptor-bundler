import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';

import AboutpageCulture from '@site/src/components/AboutpageCulture/index';
import AboutpageDetails from '@site/src/components/AboutpageDetails/index';
import AboutpageHero from '@site/src/components/AboutpageHero/index';

export default function About(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`About`}
      description={`Transeptor is more than a ERC-4337 Bundler - a vision for a more accessible and inclusive blockchain ecosystem.`}>
      <Head>
        <meta name="twitter:title" content={`About`}/>
        <meta name="twitter:description" content={`Transeptor is more than a ERC-4337 Bundler - a vision for a more accessible and inclusive blockchain ecosystem.`}/>
      </Head>
      <main>
        <AboutpageHero />
        <AboutpageDetails />
        <AboutpageCulture />
      </main>
    </Layout>
  );
}
