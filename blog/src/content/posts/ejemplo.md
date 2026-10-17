---
title: Cómo escribir un artículo
description: Plantilla de ejemplo con todo lo que admite el blog. Está marcada como borrador, así que no se publica.
date: 2026-10-18
category: Meta
tags: [plantilla, markdown]
draft: true
---

Este archivo es una **plantilla**: cópialo, cambia el frontmatter y escribe. Mientras tenga `draft: true` solo se ve con `npm run dev`; en producción no se genera.

## Frontmatter

| Campo | Obligatorio | Descripción |
|---|---|---|
| `title` | Sí | Título del artículo |
| `description` | Sí | Resumen de una o dos frases (listados, RSS y SEO) |
| `date` | Sí | Fecha de publicación, `AAAA-MM-DD` |
| `updated` | No | Fecha de la última actualización |
| `category` | Sí | Una sola categoría |
| `tags` | No | Lista de tags |
| `draft` | No | `true` para no publicarlo |

## Código

```java
List<String> names = people.stream()
    .map(Person::getName)
    .toList();
```

> Las citas, tablas, imágenes y enlaces de Markdown también funcionan.
