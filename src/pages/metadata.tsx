import React from 'react';
import Layout from '@theme/Layout';
import packageJson from '../../package.json';

export default function Home(): JSX.Element {
  return (
    <Layout>
      <main>
      <h1>v{packageJson.version}</h1>
      </main>
    </Layout>
  );
}
