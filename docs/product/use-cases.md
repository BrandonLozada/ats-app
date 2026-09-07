Buena pregunta — aquí es donde muchos se adelantan y luego rehacen cosas.

Te respondo directo y con criterio de arquitectura:

---

# 🧠 ¿Ya debes migrar la base de datos?

```text
NO todavía
```

---

## 🎯 Por qué NO

Porque aún estás en fase de:

```text
definición de comportamiento (use cases)
```

Y eso impacta:

* campos adicionales
* relaciones
* enums
* constraints

👉 Si migras ahora:

```text
vas a tener churn de migraciones innecesarias
```

---

# 🧠 ¿Ya debes instalar Better Auth?

```text
TAMPOCO todavía
```

---

## 🎯 Por qué

Porque aún no has definido:

```text
cómo se comporta el sistema en la práctica
```

Ejemplo:

* ¿cuándo se crea un User?
* ¿cuándo se vincula a Candidate?
* ¿qué pasa si ya existe?

👉 eso se define en los **flujos**, no en la instalación

---

# 🔥 ORDEN CORRECTO (importante)

```text
1. Flujos reales (use cases)  ← estás aquí
2. Ajustes finales al schema
3. Migración DB
4. Auth (Better Auth)
5. Implementación backend
```

---

# ⚠️ ERROR COMÚN

```text
“instalar todo primero”
```

👉 termina en:

* refactors constantes
* modelos rotos
* lógica duplicada

---

# 🧠 REGLA DE ORO

```text
el modelo se valida contra los flujos,
no al revés
```

---

# 🚀 AHORA SÍ — CAMINO 1: FLUJOS REALES

Voy a diseñarte los **flujos críticos del sistema MVP**, exactamente como se usarán en el hospital.

---

# 🧩 🔥 FLUJO 1 — Publicar vacante

---

## 🎯 Actor

Reclutador / Admin

---

## 🪜 Pasos

```text
1. Crear JobPosting (status = DRAFT)
2. Completar información
3. Asignar:
   - category
   - department
   - branches
4. Definir:
   - employmentType
   - salary (opcional)
5. Publicar:
   → status = PUBLISHED
   → publishedAt = now()
   → validThrough = +30 días (ejemplo)
```

---

## 🧠 Validaciones

* slug único
* category obligatorio
* mínimo una branch (recomendado)

---

# 🧩 🔥 FLUJO 2 — Aplicación directa (web)

---

## 🎯 Actor

Candidato

---

## 🪜 Pasos

```text
1. Entra a vacante (SEO page)
2. Llena formulario:
   - name
   - email
   - phone
   - CV (URL o upload)
3. Submit
```

---

## ⚙️ Backend

```text
1. Buscar Candidate por email
   → existe → usarlo
   → no existe → crear

2. Crear Application

3. Crear Lead (source = WEB)

4. (opcional)
   actualizar dataCompleteness
```

---

## 🧠 Resultado

```text
Candidate + Lead + Application
```

---

# 🧩 🔥 FLUJO 3 — Lead manual (Facebook, etc)

---

## 🎯 Actor

Reclutador

---

## 🪜 Pasos

```text
1. Crear Candidate (rápido)
   - name
   - phone (mínimo)

2. Crear Lead:
   source = FACEBOOK
   status = NEW
```

---

## 🧠 Resultado

```text
NO hay Application aún
```

---

# 🧩 🔥 FLUJO 4 — Convertir Lead → Application

---

## 🎯 Actor

Reclutador

---

## 🪜 Pasos

```text
1. Selecciona Candidate
2. Selecciona vacante
3. Crear Application
4. Lead.status = CONVERTED
```

---

# 🧩 🔥 FLUJO 5 — Registro de cuenta (opcional)

---

## 🎯 Actor

Candidato

---

## 🪜 Pasos

```text
1. Register
2. Buscar Candidate por email

   → existe:
      link User → Candidate

   → no existe:
      crear Candidate
      link
```

---

# 🧩 🔥 FLUJO 6 — Aplicación con usuario logueado

---

## 🎯 Actor

Candidato autenticado

---

## 🪜 Pasos

```text
1. User → Candidate (ya vinculado)
2. Crear Application directo
3. Crear Lead (source = WEB)
```

---

# 🧩 🔥 FLUJO 7 — Reclutador crea Application manual

---

## 🎯 Actor

Reclutador

---

## 🪜 Pasos

```text
1. Buscar o crear Candidate
2. Crear Application
3. source = EXTERNAL / REFERRAL
```

---

# 🧩 🔥 FLUJO 8 — Cerrar vacante

---

## 🎯 Actor

Admin

---

## 🪜 Pasos

```text
1. status = CLOSED
2. validThrough = now()
```

---

# 🧩 🔥 FLUJO 9 — Limpieza (anti basura)

---

## 🎯 Actor

Sistema / reclutador

---

## 🪜 Reglas

```text
if Candidate sin activity 30-60 días:
  status = INACTIVE

if rechazado:
  status = ARCHIVED
```

---

# 🧠 VALIDACIÓN DEL SCHEMA

👉 Con estos flujos:

```text
✔ tu schema YA soporta todo
✔ no falta nada crítico
```

---

# ⚠️ AJUSTES MENORES (derivados de flujos)

Te recomiendo agregar:

---

## 🔹 en Application

```prisma
appliedByUserId String? // opcional tracking
```

---

## 🔹 en CandidateLead

```prisma
convertedAt DateTime?
```

---

# 🎯 CONCLUSIÓN

```text
✔ NO migres aún
✔ NO instales auth aún
✔ tu modelo ya es sólido
✔ flujos ya definidos correctamente
```

---

# 🚀 SIGUIENTE PASO (ahora sí)

```text
Ajustar schema final (2-3 cambios pequeños)
→ MIGRAR DB
→ setup Prisma real
```

---

# ❓ Te propongo esto

En el siguiente paso te doy:

```text
✔ versión FINAL del schema (con ajustes de flujos)
✔ checklist exacto para:
   - prisma migrate
   - seed inicial (sources, etc)
   - setup limpio
```

¿Lo hacemos?
