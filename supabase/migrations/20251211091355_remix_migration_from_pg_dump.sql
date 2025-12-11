CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'organizer',
    'creator'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, username)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
  
  -- Auto-assign admin role if email matches
  IF NEW.email = 'vyuhaesport@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_admin_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_admin_permission(_user_id uuid, _permission text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    public.is_super_admin(_user_id) OR
    EXISTS (
      SELECT 1
      FROM public.admin_permissions
      WHERE user_id = _user_id
        AND permission = _permission
    )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_email(_email text) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT _email = 'vyuhaesport@gmail.com'
$$;


--
-- Name: is_creator(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_creator(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'creator'
  )
$$;


--
-- Name: is_organizer(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_organizer(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'organizer'
  )
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = _user_id
      AND p.email = 'vyuhaesport@gmail.com'
  )
$$;


--
-- Name: process_withdrawal(uuid, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_withdrawal(p_user_id uuid, p_amount numeric, p_upi_id text, p_phone text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Validate inputs
  IF p_amount < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum withdrawal is ₹10');
  END IF;
  
  IF p_phone IS NULL OR LENGTH(p_phone) < 10 THEN
    RETURN json_build_object('success', false, 'error', 'Valid phone number required');
  END IF;
  
  IF p_upi_id IS NULL OR LENGTH(p_upi_id) < 5 THEN
    RETURN json_build_object('success', false, 'error', 'Valid UPI ID required');
  END IF;

  -- Lock the row and get current balance
  SELECT wallet_balance INTO v_balance
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Atomic update - deduct from wallet
  UPDATE profiles 
  SET wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create pending withdrawal transaction
  INSERT INTO wallet_transactions (
    user_id, 
    type, 
    amount, 
    status, 
    description, 
    upi_id, 
    phone
  )
  VALUES (
    p_user_id,
    'withdrawal',
    p_amount,
    'pending',
    'Withdrawal request',
    p_upi_id,
    p_phone
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_transaction_id,
    'new_balance', v_balance - p_amount
  );
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    broadcast_type text DEFAULT 'notification'::text NOT NULL,
    target_audience text DEFAULT 'all'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_broadcasts_broadcast_type_check CHECK ((broadcast_type = ANY (ARRAY['notification'::text, 'message'::text]))),
    CONSTRAINT admin_broadcasts_target_audience_check CHECK ((target_audience = ANY (ARRAY['all'::text, 'users'::text, 'organizers'::text])))
);


--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    permission text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: chat_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    avatar_url text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    follower_user_id uuid NOT NULL,
    following_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: friends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT friends_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- Name: group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: group_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text,
    message_type text DEFAULT 'text'::text NOT NULL,
    media_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    is_admin_message boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    message_type text DEFAULT 'text'::text,
    media_url text
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    related_id uuid,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizer_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizer_applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    govt_id_proof_url text,
    experience text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    age integer,
    phone text,
    aadhaar_number text,
    instagram_link text,
    youtube_link text,
    CONSTRAINT organizer_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    description text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: player_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: player_teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo_url text,
    slogan text,
    leader_id uuid NOT NULL,
    is_open_for_players boolean DEFAULT true,
    max_members integer DEFAULT 4,
    game text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    username text,
    full_name text,
    avatar_url text,
    phone text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    date_of_birth date,
    location text,
    preferred_game text,
    in_game_name text,
    game_uid text,
    wallet_balance numeric DEFAULT 0,
    is_banned boolean DEFAULT false,
    is_frozen boolean DEFAULT false,
    device_id text
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    topic text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    request_callback boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    admin_response text,
    responded_by uuid,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'team_member'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    appointed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tournament_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournament_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tournament_id uuid NOT NULL,
    user_id uuid NOT NULL,
    team_name text,
    status text DEFAULT 'registered'::text,
    registered_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tournament_registrations_status_check CHECK ((status = ANY (ARRAY['registered'::text, 'confirmed'::text, 'cancelled'::text])))
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    game text NOT NULL,
    description text,
    image_url text,
    prize_pool text,
    entry_fee numeric DEFAULT 0,
    max_participants integer DEFAULT 100,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    registration_deadline timestamp with time zone,
    status text DEFAULT 'upcoming'::text,
    rules text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tournament_type text DEFAULT 'organizer'::text NOT NULL,
    organizer_earnings numeric DEFAULT 0,
    platform_earnings numeric DEFAULT 0,
    current_prize_pool numeric DEFAULT 0,
    total_fees_collected numeric DEFAULT 0,
    joined_users uuid[] DEFAULT '{}'::uuid[],
    winner_user_id uuid,
    winner_declared_at timestamp with time zone,
    room_id text,
    room_password text,
    prize_distribution jsonb,
    tournament_mode text DEFAULT 'solo'::text,
    CONSTRAINT tournaments_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'ongoing'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    description text,
    reason text,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    utr_number text,
    screenshot_url text,
    upi_id text,
    phone text,
    CONSTRAINT min_transaction_amount CHECK (((amount >= (10)::numeric) OR (amount <= ('-10'::integer)::numeric))),
    CONSTRAINT valid_phone CHECK (((phone IS NULL) OR (length(phone) >= 10))),
    CONSTRAINT wallet_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'rejected'::text]))),
    CONSTRAINT wallet_transactions_type_check CHECK ((type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'prize'::text, 'entry_fee'::text, 'admin_credit'::text, 'admin_debit'::text])))
);


--
-- Name: admin_broadcasts admin_broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_broadcasts
    ADD CONSTRAINT admin_broadcasts_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_permissions admin_permissions_user_id_permission_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_user_id_permission_key UNIQUE (user_id, permission);


--
-- Name: chat_groups chat_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_groups
    ADD CONSTRAINT chat_groups_pkey PRIMARY KEY (id);


--
-- Name: follows follows_follower_user_id_following_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_user_id_following_user_id_key UNIQUE (follower_user_id, following_user_id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: friends friends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_pkey PRIMARY KEY (id);


--
-- Name: friends friends_requester_id_recipient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_requester_id_recipient_id_key UNIQUE (requester_id, recipient_id);


--
-- Name: group_members group_members_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- Name: group_messages group_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizer_applications organizer_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizer_applications
    ADD CONSTRAINT organizer_applications_pkey PRIMARY KEY (id);


--
-- Name: organizer_applications organizer_applications_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizer_applications
    ADD CONSTRAINT organizer_applications_user_id_key UNIQUE (user_id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: player_team_members player_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_team_members
    ADD CONSTRAINT player_team_members_pkey PRIMARY KEY (id);


--
-- Name: player_team_members player_team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_team_members
    ADD CONSTRAINT player_team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: player_teams player_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_teams
    ADD CONSTRAINT player_teams_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_key UNIQUE (user_id);


--
-- Name: tournament_registrations tournament_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_pkey PRIMARY KEY (id);


--
-- Name: tournament_registrations tournament_registrations_tournament_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_user_id_key UNIQUE (tournament_id, user_id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: friends update_friends_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_friends_updated_at BEFORE UPDATE ON public.friends FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizer_applications update_organizer_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizer_applications_updated_at BEFORE UPDATE ON public.organizer_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_settings update_platform_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: player_teams update_player_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_player_teams_updated_at BEFORE UPDATE ON public.player_teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournaments update_tournaments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.chat_groups(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.chat_groups(id) ON DELETE CASCADE;


--
-- Name: player_team_members player_team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_team_members
    ADD CONSTRAINT player_team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.player_teams(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tournament_registrations tournament_registrations_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: tournament_registrations tournament_registrations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournament_registrations
    ADD CONSTRAINT tournament_registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tournaments tournaments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins and system can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and system can insert roles" ON public.user_roles FOR INSERT WITH CHECK (((auth.uid() = user_id) OR public.is_super_admin(auth.uid()) OR public.has_admin_permission(auth.uid(), 'organizers:manage'::text) OR public.has_admin_permission(auth.uid(), 'users:manage'::text)));


--
-- Name: admin_broadcasts Admins can create broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create broadcasts" ON public.admin_broadcasts FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR public.has_admin_permission(auth.uid(), 'notifications:view'::text)));


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_super_admin(auth.uid()));


--
-- Name: organizer_applications Admins can update applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update applications" ON public.organizer_applications FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR public.has_admin_permission(auth.uid(), 'organizers:manage'::text) OR public.has_admin_permission(auth.uid(), 'users:manage'::text)));


--
-- Name: support_tickets Admins can update tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update tickets" ON public.support_tickets FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));


--
-- Name: organizer_applications Admins can view all applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all applications" ON public.organizer_applications FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (((auth.uid() = user_id) OR public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: support_tickets Admins can view all tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all tickets" ON public.support_tickets FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));


--
-- Name: wallet_transactions Admins manage wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage wallet transactions" ON public.wallet_transactions FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));


--
-- Name: tournaments Admins organizers and creators can create tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins organizers and creators can create tournaments" ON public.tournaments FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_organizer(auth.uid()) OR public.is_creator(auth.uid())));


--
-- Name: tournaments Admins organizers and creators can delete own tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins organizers and creators can delete own tournaments" ON public.tournaments FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.is_organizer(auth.uid()) AND (created_by = auth.uid())) OR (public.is_creator(auth.uid()) AND (created_by = auth.uid()))));


--
-- Name: tournaments Admins organizers and creators can update own tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins organizers and creators can update own tournaments" ON public.tournaments FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.is_organizer(auth.uid()) AND (created_by = auth.uid())) OR (public.is_creator(auth.uid()) AND (created_by = auth.uid()))));


--
-- Name: wallet_transactions Admins update wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update wallet transactions" ON public.wallet_transactions FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));


--
-- Name: wallet_transactions Admins view all wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view all wallet transactions" ON public.wallet_transactions FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));


--
-- Name: admin_broadcasts Anyone can view broadcasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view broadcasts" ON public.admin_broadcasts FOR SELECT USING (true);


--
-- Name: player_team_members Anyone can view player team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view player team members" ON public.player_team_members FOR SELECT USING (true);


--
-- Name: player_teams Anyone can view player teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view player teams" ON public.player_teams FOR SELECT USING (true);


--
-- Name: tournament_registrations Anyone can view registrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view registrations" ON public.tournament_registrations FOR SELECT USING (true);


--
-- Name: platform_settings Anyone can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view settings" ON public.platform_settings FOR SELECT USING (true);


--
-- Name: tournaments Anyone can view tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT USING (true);


--
-- Name: player_teams Authenticated users can create player teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create player teams" ON public.player_teams FOR INSERT WITH CHECK ((auth.uid() = leader_id));


--
-- Name: tournament_registrations Authenticated users can register; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can register" ON public.tournament_registrations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_groups Group admins can delete groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group admins can delete groups" ON public.chat_groups FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_members.id) AND (group_members.user_id = auth.uid()) AND (group_members.role = 'admin'::text)))));


--
-- Name: chat_groups Group admins can update groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group admins can update groups" ON public.chat_groups FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_members.id) AND (group_members.user_id = auth.uid()) AND (group_members.role = 'admin'::text)))));


--
-- Name: player_team_members Leaders or self can remove members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders or self can remove members" ON public.player_team_members FOR DELETE USING (((EXISTS ( SELECT 1
   FROM public.player_teams
  WHERE ((player_teams.id = player_team_members.team_id) AND (player_teams.leader_id = auth.uid())))) OR (auth.uid() = user_id)));


--
-- Name: group_messages Members can send group messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can send group messages" ON public.group_messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_messages.group_id) AND (group_members.user_id = auth.uid()))))));


--
-- Name: group_messages Members can view group messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view group messages" ON public.group_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_messages.group_id) AND (group_members.user_id = auth.uid())))));


--
-- Name: platform_settings Only super admin can insert settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only super admin can insert settings" ON public.platform_settings FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));


--
-- Name: platform_settings Only super admin can update settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only super admin can update settings" ON public.platform_settings FOR UPDATE USING (public.is_super_admin(auth.uid()));


--
-- Name: admin_permissions Super admins can manage all permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage all permissions" ON public.admin_permissions USING (public.is_super_admin(auth.uid()));


--
-- Name: team_members Super admins can manage all team; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage all team" ON public.team_members USING (public.is_super_admin(auth.uid()));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: team_members Team can view team list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team can view team list" ON public.team_members FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_super_admin(auth.uid())));


--
-- Name: player_team_members Team leaders can add members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leaders can add members" ON public.player_team_members FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.player_teams
  WHERE ((player_teams.id = player_team_members.team_id) AND (player_teams.leader_id = auth.uid())))) OR (auth.uid() = user_id)));


--
-- Name: player_teams Team leaders can delete their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leaders can delete their teams" ON public.player_teams FOR DELETE USING ((auth.uid() = leader_id));


--
-- Name: player_teams Team leaders can update their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leaders can update their teams" ON public.player_teams FOR UPDATE USING ((auth.uid() = leader_id));


--
-- Name: wallet_transactions Users can create deposit transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create deposit transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (type = 'deposit'::text)));


--
-- Name: chat_groups Users can create groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create groups" ON public.chat_groups FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: organizer_applications Users can create own application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own application" ON public.organizer_applications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: support_tickets Users can create own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own tickets" ON public.support_tickets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wallet_transactions Users can create withdrawal transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create withdrawal transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (type = 'withdrawal'::text)));


--
-- Name: group_messages Users can delete own group messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own group messages" ON public.group_messages FOR DELETE USING ((auth.uid() = sender_id));


--
-- Name: messages Users can delete own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING ((auth.uid() = sender_id));


--
-- Name: tournament_registrations Users can delete own registration; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own registration" ON public.tournament_registrations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: friends Users can delete their own friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own friend requests" ON public.friends FOR DELETE USING (((auth.uid() = requester_id) OR (auth.uid() = recipient_id)));


--
-- Name: follows Users can follow; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can follow" ON public.follows FOR INSERT WITH CHECK ((auth.uid() = follower_user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: group_members Users can join groups they're invited to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can join groups they're invited to" ON public.group_members FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: group_members Users can leave groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: friends Users can send friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send friend requests" ON public.friends FOR INSERT WITH CHECK ((auth.uid() = requester_id));


--
-- Name: messages Users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) OR ((is_admin_message = true) AND (public.is_super_admin(auth.uid()) OR public.has_admin_permission(auth.uid(), 'notifications:view'::text)))));


--
-- Name: follows Users can unfollow; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING ((auth.uid() = follower_user_id));


--
-- Name: friends Users can update friend requests they received; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update friend requests they received" ON public.friends FOR UPDATE USING ((auth.uid() = recipient_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tournament_registrations Users can update own registration; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own registration" ON public.tournament_registrations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: messages Users can update their own messages read status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own messages read status" ON public.messages FOR UPDATE USING ((auth.uid() = recipient_id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);


--
-- Name: follows Users can view follows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view follows" ON public.follows FOR SELECT USING (true);


--
-- Name: chat_groups Users can view groups they are members of; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view groups they are members of" ON public.chat_groups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.group_members
  WHERE ((group_members.group_id = group_members.id) AND (group_members.user_id = auth.uid())))));


--
-- Name: organizer_applications Users can view own application; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own application" ON public.organizer_applications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_permissions Users can view own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own permissions" ON public.admin_permissions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: support_tickets Users can view own tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: group_members Users can view their group memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their group memberships" ON public.group_members FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: friends Users can view their own friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own friend requests" ON public.friends FOR SELECT USING (((auth.uid() = requester_id) OR (auth.uid() = recipient_id)));


--
-- Name: messages Users can view their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));


--
-- Name: wallet_transactions Users view own wallet transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own wallet transactions" ON public.wallet_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: admin_broadcasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

--
-- Name: friends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

--
-- Name: group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: group_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: organizer_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: player_team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: player_teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_teams ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: tournament_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


