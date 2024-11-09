import React from 'react';
import Card, { type CardItem } from './Card/Card';

const CardListLearn: CardItem[] = [
  {
    title: "📘 ERC-4337 Overview",
    link: "/learn/concepts/erc-4337",
    description: (<>
      Learn how to install and manage ERC-4337 Relayer Snap.
    </>),
  },
  {
    title: "⚔️ EOAs vs Smart Accounts",
    link: "/learn/concepts/eoa-vs-smart-contract-account",
    description: (<>
      Learn how to connect ERC-4337 Relayer smart account to your dapp.
    </>),
  },
];

export default function LearnFeatures(): JSX.Element {
  return (
    <section className="container margin-top--lg">
      <h2 className="text--left">Fundamentals of ERC-4337</h2>
      <p>Explore the core principles, features, and benefits of ERC-4337 as our expert guide takes you through the fundamentals. Whether you're a developer, blockchain enthusiast, or simply curious about token standards, this is an excellent resource to expand your knowledge.</p>
      <div className="row">
        {CardListLearn.map((props, idx) => (<Card key={idx} {...props} />))}
      </div>
    </section>
  );
}