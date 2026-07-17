--
-- PostgreSQL database dump
--

\restrict QybkmBFJzZC6CegtEcyBvh6XPj5zhNcmyajsKE8uPcFrSfdmXadLCD73gjjIKyx

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: artwork_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.artwork_status AS ENUM (
    'available',
    'sold',
    'archived'
);


--
-- Name: report_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_item_type AS ENUM (
    'artwork',
    'comment',
    'showroom'
);


--
-- Name: report_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_status AS ENUM (
    'pending',
    'resolved',
    'dismissed'
);


--
-- Name: saved_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.saved_item_type AS ENUM (
    'artwork',
    'showroom',
    'artist'
);


--
-- Name: showroom_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.showroom_status AS ENUM (
    'active',
    'archived'
);


--
-- Name: submission_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.submission_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: user_account_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_account_status AS ENUM (
    'pending',
    'approved',
    'suspended'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'visitor',
    'artist',
    'curator',
    'admin'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: artworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artworks (
    id integer NOT NULL,
    artist_id integer NOT NULL,
    title character varying(150) NOT NULL,
    description text,
    medium character varying(150),
    dimensions character varying(100),
    price numeric(10,2) NOT NULL,
    image_url text,
    status public.artwork_status DEFAULT 'available'::public.artwork_status NOT NULL,
    style_tags text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT artworks_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: artworks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artworks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artworks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artworks_id_seq OWNED BY public.artworks.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    artwork_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: guestbook_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guestbook_entries (
    id integer NOT NULL,
    room_id integer NOT NULL,
    user_id integer NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: guestbook_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guestbook_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guestbook_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guestbook_entries_id_seq OWNED BY public.guestbook_entries.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    buyer_id integer NOT NULL,
    artwork_id integer NOT NULL,
    room_id integer,
    curator_id integer,
    gross_price numeric(10,2) NOT NULL,
    commission_rate numeric(5,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    artist_net numeric(10,2) NOT NULL,
    purchased_at timestamp without time zone DEFAULT now() NOT NULL,
    payment_data jsonb
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ratings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    artwork_id integer NOT NULL,
    score smallint NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT ratings_score_check CHECK (((score >= 1) AND (score <= 5)))
);


--
-- Name: ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ratings_id_seq OWNED BY public.ratings.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    reporter_id integer NOT NULL,
    item_type public.report_item_type NOT NULL,
    item_id integer NOT NULL,
    reason text NOT NULL,
    status public.report_status DEFAULT 'pending'::public.report_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    resolved_at timestamp without time zone,
    resolved_by integer
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: saved_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_items (
    id integer NOT NULL,
    user_id integer NOT NULL,
    item_type public.saved_item_type NOT NULL,
    item_id integer NOT NULL,
    saved_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.saved_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: saved_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.saved_items_id_seq OWNED BY public.saved_items.id;


--
-- Name: showrooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.showrooms (
    id integer NOT NULL,
    curator_id integer NOT NULL,
    title character varying(150) NOT NULL,
    theme character varying(150),
    concept_essay text,
    mood_tags text[] DEFAULT '{}'::text[] NOT NULL,
    cover_image_url text,
    commission_rate numeric(5,2) DEFAULT 20.00 NOT NULL,
    status public.showroom_status DEFAULT 'active'::public.showroom_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT showrooms_commission_rate_check CHECK (((commission_rate >= (0)::numeric) AND (commission_rate <= (100)::numeric)))
);


--
-- Name: showrooms_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.showrooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: showrooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.showrooms_id_seq OWNED BY public.showrooms.id;


--
-- Name: submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.submissions (
    id integer NOT NULL,
    artwork_id integer NOT NULL,
    room_id integer NOT NULL,
    status public.submission_status DEFAULT 'pending'::public.submission_status NOT NULL,
    curatorial_note text,
    display_order integer,
    submitted_at timestamp without time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp without time zone
);


--
-- Name: submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.submissions_id_seq OWNED BY public.submissions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role DEFAULT 'visitor'::public.user_role NOT NULL,
    status public.user_account_status DEFAULT 'approved'::public.user_account_status NOT NULL,
    bio text,
    avatar_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: artworks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artworks ALTER COLUMN id SET DEFAULT nextval('public.artworks_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: guestbook_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guestbook_entries ALTER COLUMN id SET DEFAULT nextval('public.guestbook_entries_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: ratings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings ALTER COLUMN id SET DEFAULT nextval('public.ratings_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: saved_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items ALTER COLUMN id SET DEFAULT nextval('public.saved_items_id_seq'::regclass);


--
-- Name: showrooms id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showrooms ALTER COLUMN id SET DEFAULT nextval('public.showrooms_id_seq'::regclass);


--
-- Name: submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions ALTER COLUMN id SET DEFAULT nextval('public.submissions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: artworks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.artworks (id, artist_id, title, description, medium, dimensions, price, image_url, status, style_tags, created_at) FROM stdin;
3	4	Still Life with Apples	A classical study of form and light rendered in warm, quiet tones.	Oil on canvas	40x50 cm	380.00	/images/stilllifewithapples.jpg	available	{classical,still-life}	2026-07-17 21:10:30.059872
4	4	Echoes of the Sea	A soft watercolor meditation on tide and horizon.	Watercolor	35x45 cm	290.00	/images/echos-of-thesea.jpg	available	{seascape,calm}	2026-07-17 21:10:30.059872
7	5	Venus Reawakened	A mixed-media reinterpretation of classical mythology.	Mixed media	75x100 cm	710.00	/images/venus-reawakened.jpg	available	{mixed-media,mythological}	2026-07-17 21:10:30.059872
9	6	Underwater Dreamscape	A serene photographic piece capturing a moment of perfect calm.	Photography	50x70 cm	275.00	/images/underwater-dreamscape.jpg	available	{photography,serene}	2026-07-17 21:10:30.059872
10	6	Wildbloom	An energetic botanical piece bursting with color.	Oil on canvas	65x85 cm	495.00	/images/wildbloom.jpg	available	{abstract,botanical}	2026-07-17 21:10:30.059872
1	4	Ophelia	A mesmerizing blend of colors and forms that evoke a sense of boundless possibility.	Oil on canvas	60x80 cm	450.00	/images/Ophelia.jpg	sold	{abstract,ethereal}	2026-07-17 21:10:30.059872
2	4	Crimson Serenity	Flowing waves of color and light that seem to move across the canvas.	Acrylic on canvas	70x90 cm	620.00	/images/crimson-serenity.jpg	sold	{abstract,bold}	2026-07-17 21:10:30.059872
5	5	Celestial Angel	A stunning exploration of geometric shapes and ethereal figures.	Bronze sculpture	120x45x40 cm (H x W x D)	800.00	/images/celstial-angels.jpg	sold	{contemporary,sculpture}	2026-07-17 21:10:30.059872
6	5	Synaptic Souls	A surreal digital piece blurring the line between mind and matter.	Digital art	80x80 cm	540.00	/images/synaptic-souls.jpg	sold	{digital,surreal}	2026-07-17 21:10:30.059872
8	6	Tropical Paradise	A cutting-edge digital creation that blurs reality and imagination.	Digital illustration	60x60 cm	320.00	/images/tropical-paradise.jpg	sold	{digital,vibrant}	2026-07-17 21:10:30.059872
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (id, user_id, artwork_id, content, created_at) FROM stdin;
1	7	1	Absolutely mesmerizing piece, the colors pull you in.	2026-07-17 21:10:30.059872
2	8	1	I keep coming back to look at this one.	2026-07-17 21:10:30.059872
3	5	2	Bold brushwork, love the intensity.	2026-07-17 21:10:30.059872
4	7	5	This belongs in a museum.	2026-07-17 21:10:30.059872
5	4	6	The surreal quality here is stunning.	2026-07-17 21:10:30.059872
6	8	8	So vibrant, makes me want to travel.	2026-07-17 21:10:30.059872
7	7	9	Very calming composition.	2026-07-17 21:10:30.059872
8	6	3	Beautiful restraint in the color palette.	2026-07-17 21:10:30.059872
\.


--
-- Data for Name: guestbook_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guestbook_entries (id, room_id, user_id, message, created_at) FROM stdin;
1	1	7	This showroom feels like stepping into a dream, congrats Anna!	2026-07-17 21:10:30.059872
2	1	8	Loved every piece here.	2026-07-17 21:10:30.059872
3	3	8	Such a peaceful collection, beautifully curated.	2026-07-17 21:10:30.059872
4	2	4	Great energy in this room!	2026-07-17 21:10:30.059872
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, buyer_id, artwork_id, room_id, curator_id, gross_price, commission_rate, commission_amount, artist_net, purchased_at, payment_data) FROM stdin;
1	7	1	3	3	450.00	22.00	99.00	351.00	2026-07-05 21:10:30.059872	{"card_brand": "visa", "card_last4": "4242", "cardholder_name": "Elio Marquez"}
2	8	2	2	2	620.00	18.00	111.60	508.40	2026-07-08 21:10:30.059872	{"card_brand": "mastercard", "card_last4": "5588", "cardholder_name": "Nora Whitfield"}
3	7	5	1	2	800.00	20.00	160.00	640.00	2026-07-10 21:10:30.059872	{"card_brand": "visa", "card_last4": "4242", "cardholder_name": "Elio Marquez"}
4	8	6	1	2	540.00	20.00	108.00	432.00	2026-07-13 21:10:30.059872	{"card_brand": "mastercard", "card_last4": "5588", "cardholder_name": "Nora Whitfield"}
5	7	8	2	2	320.00	18.00	57.60	262.40	2026-07-15 21:10:30.059872	{"card_brand": "visa", "card_last4": "4242", "cardholder_name": "Elio Marquez"}
\.


--
-- Data for Name: ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ratings (id, user_id, artwork_id, score, created_at) FROM stdin;
1	7	1	5	2026-07-17 21:10:30.059872
2	8	1	4	2026-07-17 21:10:30.059872
3	7	5	5	2026-07-17 21:10:30.059872
4	8	2	4	2026-07-17 21:10:30.059872
5	4	6	5	2026-07-17 21:10:30.059872
6	8	8	4	2026-07-17 21:10:30.059872
7	7	9	3	2026-07-17 21:10:30.059872
8	5	3	4	2026-07-17 21:10:30.059872
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, reporter_id, item_type, item_id, reason, status, created_at, resolved_at, resolved_by) FROM stdin;
\.


--
-- Data for Name: saved_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.saved_items (id, user_id, item_type, item_id, saved_at) FROM stdin;
1	7	artwork	4	2026-07-17 21:10:30.059872
2	8	showroom	1	2026-07-17 21:10:30.059872
3	7	artist	5	2026-07-17 21:10:30.059872
4	8	artist	4	2026-07-17 21:10:30.059872
\.


--
-- Data for Name: showrooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.showrooms (id, curator_id, title, theme, concept_essay, mood_tags, cover_image_url, commission_rate, status, created_at) FROM stdin;
1	2	Dreams in Motion	Surrealism & Digital Dreams	A collection exploring the space between the conscious and the imagined, where digital and sculptural forms collide.	{surreal,dreamlike}	/images/celstial-angels.jpg	20.00	active	2026-07-17 21:10:30.059872
2	2	Chromatic Depths	Abstract Expressionism	Bold color and gesture take center stage in this collection of expressive, energetic work.	{bold,vibrant}	/images/tropical-paradise.jpg	18.00	active	2026-07-17 21:10:30.059872
3	3	Still Waters	Classical & Nature	A quiet, contemplative collection of classically-rendered scenes drawn from nature and stillness.	{calm,classical}	/images/Ophelia.jpg	22.00	active	2026-07-17 21:10:30.059872
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.submissions (id, artwork_id, room_id, status, curatorial_note, display_order, submitted_at, reviewed_at) FROM stdin;
1	1	3	approved	Perfect fit for the collection.	1	2026-07-17 21:10:30.059872	2026-06-27 21:10:30.059872
2	2	2	approved	Strong opening piece.	1	2026-07-17 21:10:30.059872	2026-06-29 21:10:30.059872
3	3	3	approved	Lovely classical tone.	2	2026-07-17 21:10:30.059872	2026-06-28 21:10:30.059872
4	4	3	approved	Fits the quiet mood well.	3	2026-07-17 21:10:30.059872	2026-06-30 21:10:30.059872
5	5	1	approved	A centerpiece for the room.	1	2026-07-17 21:10:30.059872	2026-06-22 21:10:30.059872
6	6	1	approved	Great companion piece to Celestial Angel.	2	2026-07-17 21:10:30.059872	2026-06-23 21:10:30.059872
7	7	1	pending	\N	\N	2026-07-17 21:10:30.059872	\N
8	8	2	approved	Adds nice contrast in color.	2	2026-07-17 21:10:30.059872	2026-07-02 21:10:30.059872
9	9	2	pending	\N	\N	2026-07-17 21:10:30.059872	\N
10	10	3	rejected	Doesn't fit the current theme — consider resubmitting to Chromatic Depths.	\N	2026-07-17 21:10:30.059872	2026-07-07 21:10:30.059872
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password_hash, role, status, bio, avatar_url, created_at) FROM stdin;
1	Admin	admin@artelio.com	$2a$06$6dmnjjuu.QuKkoSlccn5Pe9k1VNJYZkBtHQL.afSqEWOjs22eudhW	admin	approved	Platform administrator.	\N	2026-07-17 21:10:30.059872
2	Anna Moreau	anna.moreau@artelio.com	$2a$06$oeZ9V0IrtveyeltgC0xo3.xLJwUu.lDeiNHzRs3yUBZqDcIby/8Ca	curator	approved	Curator specializing in surrealism and digital dreamscapes.	\N	2026-07-17 21:10:30.059872
3	Julien Faure	julien.faure@artelio.com	$2a$06$D0DyUIOdNjfwZvh77IIyFe2PVCSn8/JHc40ESRtWFOC1HpmbWr1jq	curator	approved	Curator focused on classical and nature-inspired collections.	\N	2026-07-17 21:10:30.059872
4	Aria Solenne	aria.solenne@artelio.com	$2a$06$a0LQ7yp0y9Oy9N4ZhyOPOeqmFAs4wOiBTqw6yUBEuqFWjwLazgxOe	artist	approved	Oil and watercolor painter drawn to quiet, emotive scenes.	\N	2026-07-17 21:10:30.059872
5	Elara Vescovi	elara.vescovi@artelio.com	$2a$06$BSApy4a/3xedmUXOuiSc9.wzwGrKD.kl4RyjcI07bKFg8xXJ5J1s.	artist	approved	Digital artist exploring surrealism and mixed media.	\N	2026-07-17 21:10:30.059872
6	Sarah Mitchell	sarah.mitchell@artelio.com	$2a$06$6hNpsDPXXkVlSaaNfeCc6ebU3VK4hpWyBcI6HrzRG5rIw3b/XaiZO	artist	approved	Photographer and digital illustrator inspired by nature.	\N	2026-07-17 21:10:30.059872
7	Elio Marquez	elio.marquez@artelio.com	$2a$06$dgVifVM.zKKj7azwrItL.uTgqoe1/Z76fPKeUlEe.cBAl.kbBAQwS	visitor	approved	Art collector and enthusiast.	\N	2026-07-17 21:10:30.059872
8	Nora Whitfield	nora.whitfield@artelio.com	$2a$06$/5WyaD6XFUdt3W4EGnc2WuiG1MFcRE8C4/W4n0esy1CbgG/OnW6nS	visitor	approved	Loves discovering new showrooms.	\N	2026-07-17 21:10:30.059872
9	Marco Bellini	marco.bellini@artelio.com	$2a$06$FzHOZoHF0.rvR0X7b7gyEey.g7kaHjfR7NKxJVFkfDJufwNCGlx8y	curator	pending	Aspiring curator awaiting admin approval.	\N	2026-07-17 21:10:30.059872
10	Test Artist	artist@artelio.com	$2a$06$7MNbxOD7hehJdwZrsOeaSeCuYg0kQGg6fujgrou1dnKjNigSVznHW	artist	approved	Generic test artist account.	\N	2026-07-17 21:10:30.059872
11	Test Curator	curator@artelio.com	$2a$06$hn7I/PL9Te1cpLfhb03uquV5tX.ikOrSQVm1lOkg6LAEX5MuLGfOK	curator	approved	Generic test curator account.	\N	2026-07-17 21:10:30.059872
12	Test Visitor	visitor@artelio.com	$2a$06$llND3yiSnWC1p5SCo2rnmO65aytnhcROw4M3EGvn/4PsVwwg25CNC	visitor	approved	Generic test visitor account.	\N	2026-07-17 21:10:30.059872
\.


--
-- Name: artworks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.artworks_id_seq', 10, true);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comments_id_seq', 8, true);


--
-- Name: guestbook_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.guestbook_entries_id_seq', 4, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 5, true);


--
-- Name: ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ratings_id_seq', 8, true);


--
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reports_id_seq', 1, false);


--
-- Name: saved_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.saved_items_id_seq', 4, true);


--
-- Name: showrooms_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.showrooms_id_seq', 3, true);


--
-- Name: submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.submissions_id_seq', 10, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: artworks artworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artworks
    ADD CONSTRAINT artworks_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: guestbook_entries guestbook_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guestbook_entries
    ADD CONSTRAINT guestbook_entries_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_user_id_artwork_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_artwork_id_key UNIQUE (user_id, artwork_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: reports reports_reporter_id_item_type_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_item_type_item_id_key UNIQUE (reporter_id, item_type, item_id);


--
-- Name: saved_items saved_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items
    ADD CONSTRAINT saved_items_pkey PRIMARY KEY (id);


--
-- Name: saved_items saved_items_user_id_item_type_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items
    ADD CONSTRAINT saved_items_user_id_item_type_item_id_key UNIQUE (user_id, item_type, item_id);


--
-- Name: showrooms showrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showrooms
    ADD CONSTRAINT showrooms_pkey PRIMARY KEY (id);


--
-- Name: showrooms showrooms_theme_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showrooms
    ADD CONSTRAINT showrooms_theme_key UNIQUE (theme);


--
-- Name: submissions submissions_artwork_id_room_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_artwork_id_room_id_key UNIQUE (artwork_id, room_id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_artworks_artist; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artworks_artist ON public.artworks USING btree (artist_id);


--
-- Name: idx_artworks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artworks_status ON public.artworks USING btree (status);


--
-- Name: idx_artworks_style_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_artworks_style_tags ON public.artworks USING gin (style_tags);


--
-- Name: idx_comments_artwork; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_artwork ON public.comments USING btree (artwork_id);


--
-- Name: idx_guestbook_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guestbook_room ON public.guestbook_entries USING btree (room_id);


--
-- Name: idx_orders_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_buyer ON public.orders USING btree (buyer_id);


--
-- Name: idx_orders_curator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_curator ON public.orders USING btree (curator_id);


--
-- Name: idx_orders_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_room ON public.orders USING btree (room_id);


--
-- Name: idx_ratings_artwork; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_artwork ON public.ratings USING btree (artwork_id);


--
-- Name: idx_reports_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_item ON public.reports USING btree (item_type, item_id);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_status ON public.reports USING btree (status);


--
-- Name: idx_saved_items_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_items_user ON public.saved_items USING btree (user_id, item_type);


--
-- Name: idx_showrooms_curator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_showrooms_curator ON public.showrooms USING btree (curator_id);


--
-- Name: idx_showrooms_mood_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_showrooms_mood_tags ON public.showrooms USING gin (mood_tags);


--
-- Name: idx_submissions_artwork; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_artwork ON public.submissions USING btree (artwork_id);


--
-- Name: idx_submissions_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_room ON public.submissions USING btree (room_id);


--
-- Name: artworks artworks_artist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artworks
    ADD CONSTRAINT artworks_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: comments comments_artwork_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: guestbook_entries guestbook_entries_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guestbook_entries
    ADD CONSTRAINT guestbook_entries_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.showrooms(id) ON DELETE CASCADE;


--
-- Name: guestbook_entries guestbook_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guestbook_entries
    ADD CONSTRAINT guestbook_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: orders orders_artwork_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE RESTRICT;


--
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: orders orders_curator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_curator_id_fkey FOREIGN KEY (curator_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: orders orders_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.showrooms(id) ON DELETE RESTRICT;


--
-- Name: ratings ratings_artwork_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reports reports_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: saved_items saved_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_items
    ADD CONSTRAINT saved_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: showrooms showrooms_curator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.showrooms
    ADD CONSTRAINT showrooms_curator_id_fkey FOREIGN KEY (curator_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_artwork_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_artwork_id_fkey FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE CASCADE;


--
-- Name: submissions submissions_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.showrooms(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict QybkmBFJzZC6CegtEcyBvh6XPj5zhNcmyajsKE8uPcFrSfdmXadLCD73gjjIKyx

