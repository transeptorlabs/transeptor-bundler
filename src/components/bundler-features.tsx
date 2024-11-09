import React from 'react';
import Card, { type CardItem } from './Card/Card';

const CardListBundler: CardItem[] = [
  {
    title: "⚙️ Install Transeptor",
    link: "/bundler/get-started/install",
    description: (<>
      Everything you need to get started running Transeptor bundler node.
    </>),
  },
  {
    title: "⌨️ Command line Options",
    link: "/bundler/concepts/command-line-options",
    description: (<>
      List of all command line arguments supported by the bundler.
    </>),
  },
  {
    title: "🌐 RPC methods",
    link: "/bundler/get-started/rpc-method",
    description: (<>
      List of all RPC methods supported by the bundler.
    </>),
  },
];


export default function BundlerFeatures(): JSX.Element {
  return (
    <section className="container margin-top--lg">
      <h2 className="text--left">Support ERC-4337 by running a bundler node</h2>
      <p>Bundlers are crucial components of the ERC-4337. Increase Bundler diversity by running our open source ERC-4337 Bundler Transeptor. Transeptor is a modular Typescript ERC-4337 Bundler, designed with a strong emphasis on performance. It offers a wide range of bundling mode to to fit your needs.</p>
      <div className="row">
        {CardListBundler.map((props, idx) => (<Card key={idx} {...props} />))}
      </div>
    </section>
  );
}
