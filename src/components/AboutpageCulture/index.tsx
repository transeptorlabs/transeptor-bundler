import React from 'react';
import clsx from 'clsx';

import sharedStyles from '../component.module.css';
import styles from './styles.module.css';

type CultureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const CultureList: CultureItem[] = [
  {
    title: 'Build User-Friendly Infrastructure',
    Svg: require('@site/static/img/builder-friendly.svg').default,
    description: (
      <>
        We strive to make blockchain technology accessible to everyone, regardless of their technical background or level of expertise. By building products and services that are intuitive and easy to use while also providing educational resources and support to help users get started.     
      </>
    ),
  },
  {
    title: 'Explore unconventional solutions',
    Svg: require('@site/static/img/innovation.svg').default,
    description: (
      <>
        Real innovation changes the course of industries or even society; we constantly experiment with new ideas and technologies and think outside the box to push the boundaries of what's possible with decentralized applications.
      </>
    ),
  },
  {
    title: `Building Trust through Transparency`,
    Svg: require('@site/static/img/build-trust.svg').default,
    description: (
      <>
        We prioritize building a strong and supportive community around our products and services. We aim to foster collaboration through open communication and actively engage with users to gather feedback and improve the overall experience.      
      </>
    ),
  },
  
];

function Culture({title, Svg, description}: CultureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.cultureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function AboutpageCulture(): JSX.Element {
  return (
    <section className={sharedStyles.section}>
      <div className="container">
        <h2 className="text--center">Our way of doing things</h2>
        <div className="row">
          {CultureList.map((props, idx) => (
            <Culture key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
