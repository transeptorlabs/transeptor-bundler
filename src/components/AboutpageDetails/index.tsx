import React from 'react';
import clsx from 'clsx';

import sharedStyles from '../component.module.css';
import styles from './styles.module.css';
import { PopupButton } from '@typeform/embed-react'


export default function AboutpageDetails(): JSX.Element {
  return (
    <section className={sharedStyles.section}>
        <div className="container">
          {/* Columns are always 50% wide, on mobile and desktop */}
          <div className="row">
            <div className="col col-6">
              <h2>Our driving force</h2>
              <p>
                We believe in a future where blockchain technology is accessible to everyone and can empower builders to create a better world. We achieve this by building wallet infrastructure that makes it easy for developers and users to take part in the Ethereum network.
              </p>
              <div>
              <p>Join us in building a more accessible, decentralized, and transparent future for all!</p>
              <PopupButton id="fEY6nXV1" style={{ fontSize: 20 }} className="button button--primary button--lg"
                onReady={() => {}}>
                Sign up for our waiting list ⏱️
              </PopupButton>
              </div>
            </div>
            <div className="col col-6">
              <img src={require('@site/static/img/mission.jpg').default} alt="Group of people holding blocks" />
            </div>
          </div>
          
        </div>
    </section>
  );
}
