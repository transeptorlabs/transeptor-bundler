import React from 'react';
import Card, { type CardItem } from './Card/Card';

const CardListSnap: CardItem[] = [
  {
    title: "⚙️ Install Transeptor",
    link: "/snap/get-started/install",
    description: (<>
      Learn how to install and manage ERC-4337 Relayer Snap.
    </>),
  },
  {
    title: "📱📒 Connect Smart Account",
    link: "/snap/how-to/connect-sc-account",
    description: (<>
      Learn how to connect ERC-4337 Relayer smart account to your dapp.
    </>),
  },
  {
    title: "🌐 Send User Operation",
    link: "/snap/how-to/send-user-operation",
    description: (<>
      Learn how to let your dapp user sign and send user operations.
    </>),
  },
];

export default function BundlerFeatures(): JSX.Element {
  return (
    <section className="container margin-top--lg">
      <h2 className="text--left">Integrate your dapp with the ERC-4337 Relayer Snap</h2>
      <p>Your dapp can user ERC-4337 relayer snap to support ERC-4337 protocol. Allow your user sign user operations and send user operations to bundlers.</p>
      <div className="row">
        {CardListSnap.map((props, idx) => (<Card key={idx} {...props} />))}
      </div>
    </section>
  );
}