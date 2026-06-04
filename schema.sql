--
-- PostgreSQL database dump
--

\restrict gAbegtVRIu6spxOapJPgJH29oEC7POet6z1UhkTBx44CA92Uk0PfuUYXv6vqCaX

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: company_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_type AS ENUM (
    'producer',
    'buyer',
    'carrier'
);


--
-- Name: contract_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contract_status AS ENUM (
    'draft',
    'pending_confirmation',
    'active',
    'completed',
    'cancelled'
);


--
-- Name: deal_settlement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deal_settlement_type AS ENUM (
    'fixed',
    'by_weight',
    'revenue_share'
);


--
-- Name: deal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deal_status AS ENUM (
    'active',
    'payment_confirmed',
    'dispatched',
    'completed',
    'expired',
    'cancelled'
);


--
-- Name: eligible_company_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.eligible_company_type AS ENUM (
    'ALL',
    'LICENSED_ONLY'
);


--
-- Name: license_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.license_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'expired'
);


--
-- Name: listing_visibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.listing_visibility AS ENUM (
    'public',
    'private'
);


--
-- Name: manifest_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.manifest_status AS ENUM (
    'draft',
    'submitted',
    'accepted',
    'rejected'
);


--
-- Name: mwan_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mwan_role AS ENUM (
    'generator',
    'receiver',
    'transporter'
);


--
-- Name: offer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.offer_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'withdrawn'
);


--
-- Name: pricing_model; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pricing_model AS ENUM (
    'fixed',
    'by_weight',
    'revenue_share'
);


--
-- Name: sale_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sale_type AS ENUM (
    'auction',
    'direct'
);


--
-- Name: shipment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shipment_status AS ENUM (
    'planned',
    'dispatched',
    'received',
    'closed',
    'cancelled'
);


--
-- Name: targeting_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.targeting_type AS ENUM (
    'open',
    'category',
    'specific_company'
);


--
-- Name: transport_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transport_mode AS ENUM (
    'platform',
    'self_managed'
);


--
-- Name: transport_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transport_request_status AS ENUM (
    'pending',
    'accepted',
    'manifest_ready',
    'in_transit',
    'delivered',
    'closed',
    'cancelled'
);


--
-- Name: waste_listing_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.waste_listing_status AS ENUM (
    'open',
    'closed'
);


--
-- Name: waste_material; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.waste_material AS ENUM (
    'paper',
    'plastic',
    'metal',
    'glass',
    'electronics',
    'organic',
    'other'
);


--
-- Name: waste_unit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.waste_unit AS ENUM (
    'kg',
    'ton'
);


--
-- Name: weight_policy; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.weight_policy AS ENUM (
    'source_weight_only',
    'destination_weight_only',
    'dual_source_final',
    'dual_destination_final',
    'dual_higher_final'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    company_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: capabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    description_ar text,
    description_en text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    requires_license boolean DEFAULT false NOT NULL
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id text NOT NULL,
    name text NOT NULL,
    type public.company_type,
    city text NOT NULL,
    commercial_registration text,
    contact_phone text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    company_category_id uuid,
    license_number text,
    license_document_url text,
    license_status public.license_status,
    accepted_terms_at timestamp with time zone,
    receipt_failures_count integer DEFAULT 0 NOT NULL,
    offer_submission_blocked boolean DEFAULT false NOT NULL,
    licenses_json text
);


--
-- Name: company_action_selections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_action_selections (
    company_id uuid NOT NULL,
    action_id uuid NOT NULL
);


--
-- Name: company_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    description_ar text,
    description_en text,
    requires_license boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: company_capabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_capabilities (
    company_id uuid NOT NULL,
    capability_id uuid NOT NULL
);


--
-- Name: company_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    key text NOT NULL
);


--
-- Name: company_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_members (
    company_id uuid NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_roles (
    company_id uuid NOT NULL,
    role public.mwan_role NOT NULL
);


--
-- Name: contract_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    material_category_id uuid,
    material_label text NOT NULL,
    unit_option_id uuid,
    unit_label text NOT NULL,
    price_per_unit numeric(12,3) NOT NULL,
    seller_pct numeric(5,2),
    buyer_pct numeric(5,2),
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contract_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_sequences (
    year integer NOT NULL,
    next_val integer DEFAULT 1 NOT NULL
);


--
-- Name: contract_shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text NOT NULL,
    contract_id uuid NOT NULL,
    material_line_id uuid NOT NULL,
    status public.shipment_status DEFAULT 'planned'::public.shipment_status NOT NULL,
    source_weight numeric(12,3),
    destination_weight numeric(12,3),
    final_weight numeric(12,3),
    final_value numeric(14,3),
    notes text,
    planned_at timestamp with time zone DEFAULT now() NOT NULL,
    dispatched_at timestamp with time zone,
    received_at timestamp with time zone,
    closed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text NOT NULL,
    external_reference text,
    seller_company_id uuid NOT NULL,
    buyer_company_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date,
    status public.contract_status DEFAULT 'draft'::public.contract_status NOT NULL,
    weight_policy public.weight_policy NOT NULL,
    attachment_url text,
    notes text,
    confirmed_at timestamp with time zone,
    completed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_company_id uuid
);


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    offer_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    producer_company_id uuid NOT NULL,
    buyer_company_id uuid NOT NULL,
    settlement_type public.deal_settlement_type NOT NULL,
    price_per_unit numeric(12,3) NOT NULL,
    estimated_amount numeric(14,3) NOT NULL,
    actual_quantity numeric(12,3),
    final_amount numeric(14,3),
    status public.deal_status DEFAULT 'active'::public.deal_status NOT NULL,
    payment_confirmed_at timestamp with time zone,
    payment_confirmed_by uuid,
    dispatched_at timestamp with time zone,
    dispatched_by uuid,
    received_at timestamp with time zone,
    received_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_reference text,
    payment_proof_url text,
    cancelled_at timestamp with time zone,
    extended_until timestamp with time zone,
    extension_count integer DEFAULT 0 NOT NULL,
    pre_expiry_notified boolean DEFAULT false NOT NULL,
    transport_decision text
);


--
-- Name: issue_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    company_id uuid,
    message text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: listing_offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    waste_listing_id uuid NOT NULL,
    buyer_company_id uuid NOT NULL,
    price_per_unit numeric(12,3) NOT NULL,
    message text,
    status public.offer_status DEFAULT 'pending'::public.offer_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    rejection_reason text,
    acceptance_reason text
);


--
-- Name: listing_required_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_required_services (
    listing_id uuid NOT NULL,
    capability_id uuid NOT NULL
);


--
-- Name: listing_target_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_target_categories (
    listing_id uuid NOT NULL,
    company_category_id uuid NOT NULL
);


--
-- Name: manifest_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manifest_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transport_request_id uuid NOT NULL,
    external_manifest_id text,
    status public.manifest_status DEFAULT 'draft'::public.manifest_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: material_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    key text NOT NULL,
    is_sensitive boolean DEFAULT false NOT NULL,
    regulatory_code text,
    hazard_level text,
    physical_state text
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    type text NOT NULL,
    title_ar text NOT NULL,
    title_en text NOT NULL,
    body_ar text,
    body_en text,
    is_read boolean DEFAULT false NOT NULL,
    related_entity_type text,
    related_entity_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone
);


--
-- Name: transport_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    created_by_company_id uuid NOT NULL,
    transporter_company_id uuid,
    status public.transport_request_status DEFAULT 'pending'::public.transport_request_status NOT NULL,
    pickup_city text,
    delivery_city text,
    waste_description text,
    notes text,
    planned_pickup_at timestamp with time zone,
    actual_pickup_at timestamp with time zone,
    delivered_at timestamp with time zone,
    closed_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vehicle_plate text,
    transport_mode public.transport_mode DEFAULT 'platform'::public.transport_mode NOT NULL,
    transporter_name text,
    waste_category_id uuid,
    waste_subcategory_id uuid,
    manifest_ref text,
    pickup_facility_name text,
    delivery_facility_name text,
    ops_assigned_to text,
    email_sent boolean DEFAULT false NOT NULL
);


--
-- Name: unit_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    symbol text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    key text NOT NULL
);


--
-- Name: waste_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waste_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    material public.waste_material NOT NULL,
    quantity numeric(12,3) NOT NULL,
    unit public.waste_unit NOT NULL,
    city text NOT NULL,
    description text,
    price_hint numeric(12,2),
    status public.waste_listing_status DEFAULT 'open'::public.waste_listing_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    pricing_model public.pricing_model DEFAULT 'fixed'::public.pricing_model NOT NULL,
    visibility public.listing_visibility DEFAULT 'public'::public.listing_visibility NOT NULL,
    image_url text,
    sale_type public.sale_type DEFAULT 'auction'::public.sale_type NOT NULL,
    unit_option_id uuid,
    material_category_id uuid,
    material_subcategory_id uuid,
    revenue_share_pct numeric(5,2),
    targeting_type public.targeting_type DEFAULT 'open'::public.targeting_type NOT NULL,
    target_company_id uuid,
    unit_notes text,
    eligible_company_type public.eligible_company_type DEFAULT 'ALL'::public.eligible_company_type NOT NULL
);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: capabilities capabilities_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capabilities
    ADD CONSTRAINT capabilities_key_unique UNIQUE (key);


--
-- Name: capabilities capabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capabilities
    ADD CONSTRAINT capabilities_pkey PRIMARY KEY (id);


--
-- Name: companies companies_owner_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_owner_user_id_unique UNIQUE (owner_user_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_action_selections company_action_selections_company_id_action_id_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_action_selections
    ADD CONSTRAINT company_action_selections_company_id_action_id_pk PRIMARY KEY (company_id, action_id);


--
-- Name: company_actions company_actions_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_actions
    ADD CONSTRAINT company_actions_key_unique UNIQUE (key);


--
-- Name: company_actions company_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_actions
    ADD CONSTRAINT company_actions_pkey PRIMARY KEY (id);


--
-- Name: company_capabilities company_capability_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_capabilities
    ADD CONSTRAINT company_capability_unique UNIQUE (company_id, capability_id);


--
-- Name: company_categories company_categories_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_categories
    ADD CONSTRAINT company_categories_key_unique UNIQUE (key);


--
-- Name: company_categories company_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_categories
    ADD CONSTRAINT company_categories_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_user_unique UNIQUE (user_id);


--
-- Name: company_roles company_roles_company_id_role_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_company_id_role_pk PRIMARY KEY (company_id, role);


--
-- Name: contract_materials contract_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_materials
    ADD CONSTRAINT contract_materials_pkey PRIMARY KEY (id);


--
-- Name: contract_sequences contract_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_sequences
    ADD CONSTRAINT contract_sequences_pkey PRIMARY KEY (year);


--
-- Name: contract_shipments contract_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_shipments
    ADD CONSTRAINT contract_shipments_pkey PRIMARY KEY (id);


--
-- Name: contract_shipments contract_shipments_reference_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_shipments
    ADD CONSTRAINT contract_shipments_reference_unique UNIQUE (reference);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_reference_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_reference_unique UNIQUE (reference);


--
-- Name: deals deals_offer_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_offer_id_unique UNIQUE (offer_id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: issue_reports issue_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_reports
    ADD CONSTRAINT issue_reports_pkey PRIMARY KEY (id);


--
-- Name: listing_offers listing_offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_offers
    ADD CONSTRAINT listing_offers_pkey PRIMARY KEY (id);


--
-- Name: listing_offers listing_offers_waste_listing_id_buyer_company_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_offers
    ADD CONSTRAINT listing_offers_waste_listing_id_buyer_company_id_unique UNIQUE (waste_listing_id, buyer_company_id);


--
-- Name: listing_required_services listing_required_service_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_required_services
    ADD CONSTRAINT listing_required_service_unique UNIQUE (listing_id, capability_id);


--
-- Name: listing_target_categories listing_target_category_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_target_categories
    ADD CONSTRAINT listing_target_category_unique UNIQUE (listing_id, company_category_id);


--
-- Name: manifest_records manifest_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manifest_records
    ADD CONSTRAINT manifest_records_pkey PRIMARY KEY (id);


--
-- Name: material_categories material_categories_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_categories
    ADD CONSTRAINT material_categories_key_unique UNIQUE (key);


--
-- Name: material_categories material_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_categories
    ADD CONSTRAINT material_categories_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: transport_requests transport_requests_manifest_ref_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_manifest_ref_unique UNIQUE (manifest_ref);


--
-- Name: transport_requests transport_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_pkey PRIMARY KEY (id);


--
-- Name: unit_options unit_options_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_options
    ADD CONSTRAINT unit_options_key_unique UNIQUE (key);


--
-- Name: unit_options unit_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit_options
    ADD CONSTRAINT unit_options_pkey PRIMARY KEY (id);


--
-- Name: waste_listings waste_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_listings
    ADD CONSTRAINT waste_listings_pkey PRIMARY KEY (id);


--
-- Name: idx_contract_materials_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contract_materials_contract_id ON public.contract_materials USING btree (contract_id);


--
-- Name: idx_contracts_buyer_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_buyer_company_id ON public.contracts USING btree (buyer_company_id);


--
-- Name: idx_contracts_seller_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_seller_company_id ON public.contracts USING btree (seller_company_id);


--
-- Name: idx_contracts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);


--
-- Name: idx_deals_buyer_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_buyer_company_id ON public.deals USING btree (buyer_company_id);


--
-- Name: idx_deals_listing_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_listing_id ON public.deals USING btree (listing_id);


--
-- Name: idx_deals_producer_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deals_producer_company_id ON public.deals USING btree (producer_company_id);


--
-- Name: idx_shipments_contract_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_contract_id ON public.contract_shipments USING btree (contract_id);


--
-- Name: idx_shipments_material_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_material_line_id ON public.contract_shipments USING btree (material_line_id);


--
-- Name: idx_shipments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipments_status ON public.contract_shipments USING btree (status);


--
-- Name: audit_log audit_log_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: companies companies_company_category_id_company_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_category_id_company_categories_id_fk FOREIGN KEY (company_category_id) REFERENCES public.company_categories(id) ON DELETE SET NULL;


--
-- Name: company_action_selections company_action_selections_action_id_company_actions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_action_selections
    ADD CONSTRAINT company_action_selections_action_id_company_actions_id_fk FOREIGN KEY (action_id) REFERENCES public.company_actions(id) ON DELETE CASCADE;


--
-- Name: company_action_selections company_action_selections_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_action_selections
    ADD CONSTRAINT company_action_selections_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_capabilities company_capabilities_capability_id_capabilities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_capabilities
    ADD CONSTRAINT company_capabilities_capability_id_capabilities_id_fk FOREIGN KEY (capability_id) REFERENCES public.capabilities(id) ON DELETE CASCADE;


--
-- Name: company_capabilities company_capabilities_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_capabilities
    ADD CONSTRAINT company_capabilities_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_members company_members_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_roles company_roles_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: contract_materials contract_materials_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_materials
    ADD CONSTRAINT contract_materials_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contract_materials contract_materials_material_category_id_material_categories_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_materials
    ADD CONSTRAINT contract_materials_material_category_id_material_categories_id_ FOREIGN KEY (material_category_id) REFERENCES public.material_categories(id) ON DELETE RESTRICT;


--
-- Name: contract_materials contract_materials_unit_option_id_unit_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_materials
    ADD CONSTRAINT contract_materials_unit_option_id_unit_options_id_fk FOREIGN KEY (unit_option_id) REFERENCES public.unit_options(id) ON DELETE RESTRICT;


--
-- Name: contract_shipments contract_shipments_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_shipments
    ADD CONSTRAINT contract_shipments_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE RESTRICT;


--
-- Name: contract_shipments contract_shipments_material_line_id_contract_materials_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_shipments
    ADD CONSTRAINT contract_shipments_material_line_id_contract_materials_id_fk FOREIGN KEY (material_line_id) REFERENCES public.contract_materials(id) ON DELETE RESTRICT;


--
-- Name: contracts contracts_buyer_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_buyer_company_id_companies_id_fk FOREIGN KEY (buyer_company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: contracts contracts_created_by_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_created_by_company_id_companies_id_fk FOREIGN KEY (created_by_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_seller_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_seller_company_id_companies_id_fk FOREIGN KEY (seller_company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: deals deals_buyer_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_buyer_company_id_companies_id_fk FOREIGN KEY (buyer_company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: deals deals_dispatched_by_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_dispatched_by_companies_id_fk FOREIGN KEY (dispatched_by) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: deals deals_listing_id_waste_listings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_listing_id_waste_listings_id_fk FOREIGN KEY (listing_id) REFERENCES public.waste_listings(id) ON DELETE RESTRICT;


--
-- Name: deals deals_offer_id_listing_offers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_offer_id_listing_offers_id_fk FOREIGN KEY (offer_id) REFERENCES public.listing_offers(id) ON DELETE RESTRICT;


--
-- Name: deals deals_payment_confirmed_by_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_payment_confirmed_by_companies_id_fk FOREIGN KEY (payment_confirmed_by) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: deals deals_producer_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_producer_company_id_companies_id_fk FOREIGN KEY (producer_company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: deals deals_received_by_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_received_by_companies_id_fk FOREIGN KEY (received_by) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: issue_reports issue_reports_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_reports
    ADD CONSTRAINT issue_reports_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: listing_offers listing_offers_buyer_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_offers
    ADD CONSTRAINT listing_offers_buyer_company_id_companies_id_fk FOREIGN KEY (buyer_company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: listing_offers listing_offers_waste_listing_id_waste_listings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_offers
    ADD CONSTRAINT listing_offers_waste_listing_id_waste_listings_id_fk FOREIGN KEY (waste_listing_id) REFERENCES public.waste_listings(id) ON DELETE CASCADE;


--
-- Name: listing_required_services listing_required_services_capability_id_capabilities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_required_services
    ADD CONSTRAINT listing_required_services_capability_id_capabilities_id_fk FOREIGN KEY (capability_id) REFERENCES public.capabilities(id) ON DELETE CASCADE;


--
-- Name: listing_required_services listing_required_services_listing_id_waste_listings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_required_services
    ADD CONSTRAINT listing_required_services_listing_id_waste_listings_id_fk FOREIGN KEY (listing_id) REFERENCES public.waste_listings(id) ON DELETE CASCADE;


--
-- Name: listing_target_categories listing_target_categories_company_category_id_company_categorie; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_target_categories
    ADD CONSTRAINT listing_target_categories_company_category_id_company_categorie FOREIGN KEY (company_category_id) REFERENCES public.company_categories(id) ON DELETE CASCADE;


--
-- Name: listing_target_categories listing_target_categories_listing_id_waste_listings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listing_target_categories
    ADD CONSTRAINT listing_target_categories_listing_id_waste_listings_id_fk FOREIGN KEY (listing_id) REFERENCES public.waste_listings(id) ON DELETE CASCADE;


--
-- Name: manifest_records manifest_records_transport_request_id_transport_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manifest_records
    ADD CONSTRAINT manifest_records_transport_request_id_transport_requests_id_fk FOREIGN KEY (transport_request_id) REFERENCES public.transport_requests(id) ON DELETE RESTRICT;


--
-- Name: notifications notifications_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: transport_requests transport_requests_created_by_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_created_by_company_id_companies_id_fk FOREIGN KEY (created_by_company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;


--
-- Name: transport_requests transport_requests_deal_id_deals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_deal_id_deals_id_fk FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE RESTRICT;


--
-- Name: transport_requests transport_requests_transporter_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_transporter_company_id_companies_id_fk FOREIGN KEY (transporter_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: transport_requests transport_requests_waste_category_id_material_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_waste_category_id_material_categories_id_fk FOREIGN KEY (waste_category_id) REFERENCES public.material_categories(id) ON DELETE SET NULL;


--
-- Name: transport_requests transport_requests_waste_subcategory_id_material_categories_id_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_waste_subcategory_id_material_categories_id_ FOREIGN KEY (waste_subcategory_id) REFERENCES public.material_categories(id) ON DELETE SET NULL;


--
-- Name: waste_listings waste_listings_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_listings
    ADD CONSTRAINT waste_listings_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: waste_listings waste_listings_material_category_id_material_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_listings
    ADD CONSTRAINT waste_listings_material_category_id_material_categories_id_fk FOREIGN KEY (material_category_id) REFERENCES public.material_categories(id) ON DELETE SET NULL;


--
-- Name: waste_listings waste_listings_material_subcategory_id_material_categories_id_f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_listings
    ADD CONSTRAINT waste_listings_material_subcategory_id_material_categories_id_f FOREIGN KEY (material_subcategory_id) REFERENCES public.material_categories(id) ON DELETE SET NULL;


--
-- Name: waste_listings waste_listings_target_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_listings
    ADD CONSTRAINT waste_listings_target_company_id_companies_id_fk FOREIGN KEY (target_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: waste_listings waste_listings_unit_option_id_unit_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.waste_listings
    ADD CONSTRAINT waste_listings_unit_option_id_unit_options_id_fk FOREIGN KEY (unit_option_id) REFERENCES public.unit_options(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict gAbegtVRIu6spxOapJPgJH29oEC7POet6z1UhkTBx44CA92Uk0PfuUYXv6vqCaX

--
-- Name: company_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    invited_by text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    expires_at timestamp with time zone,
    CONSTRAINT company_invitations_status_check CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
    CONSTRAINT company_invitations_role_check CHECK (role = 'member'::text)
);

ALTER TABLE ONLY public.company_invitations
    ADD CONSTRAINT company_invitations_pkey PRIMARY KEY (id);

CREATE UNIQUE INDEX company_invitations_unique_pending_email_company
    ON public.company_invitations USING btree (company_id, lower(email))
    WHERE (status = 'pending'::text);

ALTER TABLE ONLY public.company_invitations
    ADD CONSTRAINT company_invitations_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
