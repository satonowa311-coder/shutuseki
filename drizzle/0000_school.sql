CREATE TABLE owners (id integer PRIMARY KEY NOT NULL, user_id text NOT NULL);
--> statement-breakpoint
CREATE TABLE members (email text PRIMARY KEY NOT NULL, user_id text, role text NOT NULL, name text NOT NULL);
--> statement-breakpoint
CREATE TABLE documents (id integer PRIMARY KEY NOT NULL, revision integer NOT NULL, payload text NOT NULL, change_id text NOT NULL);
--> statement-breakpoint
CREATE TABLE audits (id text PRIMARY KEY NOT NULL, actor text NOT NULL, operation text NOT NULL, created_at text NOT NULL, revision integer NOT NULL);
