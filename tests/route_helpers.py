def route_paths(app: object) -> set[str]:
    paths = set()
    for route in app.routes:
        if hasattr(route, "path"):
            paths.add(route.path)
        original_router = getattr(route, "original_router", None)
        if original_router is not None:
            paths.update(
                nested_route.path
                for nested_route in original_router.routes
                if hasattr(nested_route, "path")
            )
    return paths
