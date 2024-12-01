import React from "react";
import Card, { type CardItem } from "./Card/Card";

const CardListBundler: CardItem[] = [
  {
    title: "⚙️ Install Transeptor",
    link: "/docs/get-started#quick-start",
    description: (
      <>Quick start guide to get you up and running.</>
    ),
  },
  {
    title: "⌨️ Command line Options",
    link: "/docs/running-transeptor#command-line-arguments", 
    description: (
      <>List of all CLI options supported by Transeptor.</>
    ),
  },
  {
    title: "🌐 Interacting with Transeptor",
    link: "/docs/category/interacting-with-transeptor",
    description: <>List of all RPC methods supported by Transeptor.</>,
  },
];

export default function BundlerFeatures(): JSX.Element {
  return (
    <section className="container margin-top--lg">
      <h2 className="text--left">Support ERC-4337 by running a bundler node</h2>
      <p>
        Bundlers are crucial components of the ERC-4337. Increase Bundler
        diversity by running our open-source ERC-4337 Bundler.
      </p>
      <div className="row">
        {CardListBundler.map((props, idx) => (
          <Card key={idx} {...props} />
        ))}
      </div>
    </section>
  );
}
