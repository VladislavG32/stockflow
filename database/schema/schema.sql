SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE SCHEMA drizzle;
SET default_tablespace = '';
SET default_table_access_method = heap;
CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);
CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;
CREATE TABLE public.materials (
    id integer NOT NULL,
    code character varying(40) NOT NULL,
    name character varying(160) NOT NULL,
    category character varying(100) NOT NULL,
    unit character varying(20) NOT NULL,
    minimum_stock integer DEFAULT 0 NOT NULL,
    target_stock integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT materials_stock_limits CHECK (((minimum_stock >= 0) AND (target_stock >= minimum_stock) AND (target_stock <= 1000000)))
);
CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;
CREATE TABLE public.receipts (
    id integer NOT NULL,
    number character varying(40) NOT NULL,
    material_id integer NOT NULL,
    supplier_id integer NOT NULL,
    quantity integer NOT NULL,
    received_on character varying(10) NOT NULL,
    note character varying(500) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    unit_price_kopecks integer,
    document_reference character varying(120),
    CONSTRAINT receipts_positive_quantity CHECK (((quantity > 0) AND (quantity <= 1000000))),
    CONSTRAINT receipts_price_range CHECK (((unit_price_kopecks IS NULL) OR ((unit_price_kopecks >= 0) AND (unit_price_kopecks <= 1000000000))))
);
CREATE SEQUENCE public.receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.receipts_id_seq OWNED BY public.receipts.id;
CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(160) NOT NULL,
    contact character varying(200) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;
ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);
ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);
ALTER TABLE ONLY public.receipts ALTER COLUMN id SET DEFAULT nextval('public.receipts_id_seq'::regclass);
ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);
ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_code_unique UNIQUE (code);
ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_number_unique UNIQUE (number);
ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_name_unique UNIQUE (name);
ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);
CREATE INDEX receipts_material_idx ON public.receipts USING btree (material_id);
CREATE INDEX receipts_supplier_idx ON public.receipts USING btree (supplier_id);
ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_material_id_materials_id_fk FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;
