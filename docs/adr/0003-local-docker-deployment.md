# Serve a single-user dashboard locally through Docker

V1 runs in a Docker container with the application listening on `0.0.0.0`, reachable from the developer's local machine and LAN. It serves one owner on a trusted LAN without login or public registration; anyone who can reach the application can view and edit its contents.

All application data persists in a mounted host directory so container replacement retains the records. V1 accepts manual backups made by stopping the container and copying that directory; automated backups and in-app export are deferred to keep local operation simple.
