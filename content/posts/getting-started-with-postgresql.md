---
title: Getting Started with PostGreSQL
date: '2025-08-23'
description: >-
  This Post will walk you through the steps of getting started with PostGreSQL
  database
tags:
  - backendpostgresql
published: false
---
# PostgreSQL Sample Database

Summary: in this tutorial, we will introduce you to a PostgreSQL sample database that you can use for learning and practicing PostgreSQL.

We will use the DVD rental database to demonstrate the features of PostgreSQL.

The DVD rental database represents the business processes of a DVD rental store. The DVD rental database has many objects, including:

## Run psql command
`psql -U postgres`

### To show the current database, you can use the following command:
`SELECT current_database();`

1. 

 ### Run Sellect query
```sql
SELECT
   select_list
FROM
   table_name;
```

2. ### Bigger query
```sql
SELECT
   first_name,
   last_name,
   email
FROM
   customer;
```
