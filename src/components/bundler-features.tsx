import React from "react";
import Card, { type CardItem } from "./Card/Card";

const CardListBundler: CardItem[] = [
  {
    title: "⚙️ Install Transeptor",
    link: "/docs#quick-start",
    description: (
      <>Everything you need to get started running the Transeptor bundler node.</>
    ),
  },
  {
    title: "⌨️ Command line Options",
    link: "/docs#command-line-arguments",
    description: (
      <>List of all command line arguments supported by the bundler.</>
    ),
  },
  {
    title: "🌐 Interacting with Transeptor",
    link: "/docs/category/interacting-with-transeptor",
    description: <>List of all RPC methods supported by the bundler.</>,
  },
];

export default function BundlerFeatures(): JSX.Element {
  return (
    <section className="container margin-top--lg">
      <h2 className="text--left">Support ERC-4337 by running a bundler node</h2>
      <p>
        Bundlers are crucial components of the ERC-4337. Increase Bundler
        diversity by running our open-source ERC-4337 Bundler Transeptor.
        Transeptor is a light weight blazing fast, modular ERC-4337 TypeScript
        bundler built with declarative{" "}
        <a href="https://en.wikipedia.org/wiki/Functional_programming">
          functional programming
        </a>
        . It offers a wide range of bundling modes to fit your needs.
      </p>
      <div className="row">
        {CardListBundler.map((props, idx) => (
          <Card key={idx} {...props} />
        ))}
      </div>
    </section>
  );
}
