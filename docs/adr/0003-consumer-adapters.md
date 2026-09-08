# ADR-0003: Consumer adapter boundary

## Status

Accepted — 2026-09-08

## Decision

Echoes of Aion and MRPG Realms integrate through adapter contracts. Echoes remains turn-based and server-authoritative; MRPG remains real-time and server-authoritative. ThreeGameForge may transport commands, schedule updates, and present snapshots, but it must not resolve game rules or duplicate consumer state.

The current examples are contract fixtures only. Live integration is a separate task requiring explicit dependency mapping and acceptance in each consumer repository.
