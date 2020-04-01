# Caf.js

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See https://www.cafjs.com

## Security Example Creating a Public Infrastructure of Ephemeral Diffie-Hellman Keys

In a browser it is difficult to keep safe long term secrets that are accessible by JavaScript code. We take advantage that DH keys are cheap to create, and that we have a trusted path in the Cloud between CAs, to provide a public key infrastructure that uses ephemeral DH keys. Every login creates new keys, and these public keys propagate quickly, and safely, to all interested parties.

This infrastructure can then be used to bootstrap secure, direct channels between devices while providing end-to-end security (CAs never know secret keys). Authorization mechanisms managed by CAs also ensure that our devices only talk with devices that we trust. This is done by controlling the discovery of public keys.

We use a `SharedMap`, i.e.,  `<username>-manager-pubkeys`, to make visible all the public keys of the devices that `<username>` owns. Therefore, each user needs to create a  privileged CA `<username>-manager` first. This CA also maintains an `AggregateMap`, i.e., `<username>-manager-authorized` with the access policy for all its devices. Note that by  linking this `AggregateMap` to another user's `AggregateMap` we can enable interactions between their devices in a simple manner.
