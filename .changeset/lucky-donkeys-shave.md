---
'@bingoo.ai/explainer-kernel': minor
---

Add the kernel package: instance-based registries, a layered configuration resolver, environment interpolation and a shared error type.

Registries are constructed rather than module-level, so two lessons or two tenants never share state. Descriptors are validated by zod at registration, so a malformed entry fails at startup instead of surfacing as a blank scene mid-lesson. Values are created lazily and reused per registry instance.

The configuration resolver merges layers in the documented precedence order — defaults, config file, environment, workspace settings, runtime UI settings — and validates the result once. It performs no I/O; the application supplies already-loaded layers.
