
INSERT INTO users (id, username, email, password_hash, role, status, bio, avatar_url) VALUES
(1, 'Admin',          'admin@artelio.com',        crypt('Password123!', gen_salt('bf')), 'admin',   'approved', 'Platform administrator.', NULL),
(2, 'Anna Moreau',    'anna.moreau@artelio.com',  crypt('Password123!', gen_salt('bf')), 'curator', 'approved', 'Curator specializing in surrealism and digital dreamscapes.', NULL),
(3, 'Julien Faure',   'julien.faure@artelio.com', crypt('Password123!', gen_salt('bf')), 'curator', 'approved', 'Curator focused on classical and nature-inspired collections.', NULL),
(4, 'Aria Solenne',   'aria.solenne@artelio.com', crypt('Password123!', gen_salt('bf')), 'artist',  'approved', 'Oil and watercolor painter drawn to quiet, emotive scenes.', NULL),
(5, 'Elara Vescovi',  'elara.vescovi@artelio.com',crypt('Password123!', gen_salt('bf')), 'artist',  'approved', 'Digital artist exploring surrealism and mixed media.', NULL),
(6, 'Sarah Mitchell', 'sarah.mitchell@artelio.com',crypt('Password123!', gen_salt('bf')),'artist',  'approved', 'Photographer and digital illustrator inspired by nature.', NULL),
(7, 'Elio Marquez',   'elio.marquez@artelio.com', crypt('Password123!', gen_salt('bf')), 'visitor', 'approved', 'Art collector and enthusiast.', NULL),
(8, 'Nora Whitfield', 'nora.whitfield@artelio.com',crypt('Password123!', gen_salt('bf')),'visitor', 'approved', 'Loves discovering new showrooms.', NULL),
(9, 'Marco Bellini',  'marco.bellini@artelio.com',crypt('Password123!', gen_salt('bf')), 'curator', 'pending',  'Aspiring curator awaiting admin approval.', NULL),
(10, 'Test Artist',   'artist@artelio.com',       crypt('Password123!', gen_salt('bf')), 'artist',  'approved', 'Generic test artist account.', NULL),
(11, 'Test Curator',  'curator@artelio.com',      crypt('Password123!', gen_salt('bf')), 'curator', 'approved', 'Generic test curator account.', NULL),
(12, 'Test Visitor',  'visitor@artelio.com',      crypt('Password123!', gen_salt('bf')), 'visitor', 'approved', 'Generic test visitor account.', NULL);

INSERT INTO artworks (id, artist_id, title, description, medium, dimensions, price, image_url, style_tags) VALUES
(1, 4, 'Ophelia',                 'A mesmerizing blend of colors and forms that evoke a sense of boundless possibility.', 'Oil on canvas',       '60x80 cm',  450.00, '/images/Ophelia.jpg',                ARRAY['abstract','ethereal']),
(2, 4, 'Crimson Serenity',        'Flowing waves of color and light that seem to move across the canvas.',               'Acrylic on canvas',   '70x90 cm',  620.00, '/images/crimson-serenity.jpg',       ARRAY['abstract','bold']),
(3, 4, 'Still Life with Apples',  'A classical study of form and light rendered in warm, quiet tones.',                  'Oil on canvas',       '40x50 cm',  380.00, '/images/stilllifewithapples.jpg',    ARRAY['classical','still-life']),
(4, 4, 'Echoes of the Sea',       'A soft watercolor meditation on tide and horizon.',                                   'Watercolor',          '35x45 cm',  290.00, '/images/echos-of-thesea.jpg',        ARRAY['seascape','calm']),
(5, 5, 'Celestial Angel',         'A stunning exploration of geometric shapes and ethereal figures.',                    'Bronze sculpture',    '120x45x40 cm (H x W x D)',  800.00, '/images/celstial-angels.jpg',        ARRAY['contemporary','sculpture']),
(6, 5, 'Synaptic Souls',          'A surreal digital piece blurring the line between mind and matter.',                  'Digital art',         '80x80 cm',  540.00, '/images/synaptic-souls.jpg',         ARRAY['digital','surreal']),
(7, 5, 'Venus Reawakened',        'A mixed-media reinterpretation of classical mythology.',                              'Mixed media',         '75x100 cm', 710.00, '/images/venus-reawakened.jpg',       ARRAY['mixed-media','mythological']),
(8, 6, 'Tropical Paradise',       'A cutting-edge digital creation that blurs reality and imagination.',                 'Digital illustration','60x60 cm',  320.00, '/images/tropical-paradise.jpg',      ARRAY['digital','vibrant']),
(9, 6, 'Underwater Dreamscape',   'A serene photographic piece capturing a moment of perfect calm.',                     'Photography',         '50x70 cm',  275.00, '/images/underwater-dreamscape.jpg',  ARRAY['photography','serene']),
(10,6, 'Wildbloom',               'An energetic botanical piece bursting with color.',                                   'Oil on canvas',       '65x85 cm',  495.00, '/images/wildbloom.jpg',              ARRAY['abstract','botanical']);

INSERT INTO showrooms (id, curator_id, title, theme, concept_essay, mood_tags, cover_image_url, commission_rate) VALUES
(1, 2, 'Dreams in Motion',  'Surrealism & Digital Dreams',
   'A collection exploring the space between the conscious and the imagined, where digital and sculptural forms collide.',
   ARRAY['surreal','dreamlike'], '/images/celstial-angels.jpg', 20.00),
(2, 2, 'Chromatic Depths',  'Abstract Expressionism',
   'Bold color and gesture take center stage in this collection of expressive, energetic work.',
   ARRAY['bold','vibrant'], '/images/tropical-paradise.jpg', 18.00),
(3, 3, 'Still Waters',      'Classical & Nature',
   'A quiet, contemplative collection of classically-rendered scenes drawn from nature and stillness.',
   ARRAY['calm','classical'], '/images/Ophelia.jpg', 22.00);

INSERT INTO submissions (id, artwork_id, room_id, status, curatorial_note, display_order, reviewed_at) VALUES
(1,  1, 3, 'approved', 'Perfect fit for the collection.', 1, NOW() - INTERVAL '20 days'),
(2,  2, 2, 'approved', 'Strong opening piece.',           1, NOW() - INTERVAL '18 days'),
(3,  3, 3, 'approved', 'Lovely classical tone.',          2, NOW() - INTERVAL '19 days'),
(4,  4, 3, 'approved', 'Fits the quiet mood well.',       3, NOW() - INTERVAL '17 days'),
(5,  5, 1, 'approved', 'A centerpiece for the room.',     1, NOW() - INTERVAL '25 days'),
(6,  6, 1, 'approved', 'Great companion piece to Celestial Angel.', 2, NOW() - INTERVAL '24 days'),
(7,  7, 1, 'pending',   NULL,                             NULL, NULL),
(8,  8, 2, 'approved', 'Adds nice contrast in color.',    2, NOW() - INTERVAL '15 days'),
(9,  9, 2, 'pending',   NULL,                             NULL, NULL),
(10, 10,3, 'rejected', 'Doesn''t fit the current theme — consider resubmitting to Chromatic Depths.', NULL, NOW() - INTERVAL '10 days');

INSERT INTO orders (buyer_id, artwork_id, room_id, curator_id, gross_price, commission_rate, commission_amount, artist_net, purchased_at, payment_data)
SELECT 7, a.id, s.id, s.curator_id, a.price, s.commission_rate,
       ROUND(a.price * s.commission_rate / 100, 2),
       a.price - ROUND(a.price * s.commission_rate / 100, 2),
       NOW() - INTERVAL '12 days',
       '{"card_brand":"visa","card_last4":"4242","cardholder_name":"Elio Marquez"}'::jsonb
FROM artworks a, showrooms s WHERE a.id = 1 AND s.id = 3;

INSERT INTO orders (buyer_id, artwork_id, room_id, curator_id, gross_price, commission_rate, commission_amount, artist_net, purchased_at, payment_data)
SELECT 8, a.id, s.id, s.curator_id, a.price, s.commission_rate,
       ROUND(a.price * s.commission_rate / 100, 2),
       a.price - ROUND(a.price * s.commission_rate / 100, 2),
       NOW() - INTERVAL '9 days',
       '{"card_brand":"mastercard","card_last4":"5588","cardholder_name":"Nora Whitfield"}'::jsonb
FROM artworks a, showrooms s WHERE a.id = 2 AND s.id = 2;

INSERT INTO orders (buyer_id, artwork_id, room_id, curator_id, gross_price, commission_rate, commission_amount, artist_net, purchased_at, payment_data)
SELECT 7, a.id, s.id, s.curator_id, a.price, s.commission_rate,
       ROUND(a.price * s.commission_rate / 100, 2),
       a.price - ROUND(a.price * s.commission_rate / 100, 2),
       NOW() - INTERVAL '7 days',
       '{"card_brand":"visa","card_last4":"4242","cardholder_name":"Elio Marquez"}'::jsonb
FROM artworks a, showrooms s WHERE a.id = 5 AND s.id = 1;

INSERT INTO orders (buyer_id, artwork_id, room_id, curator_id, gross_price, commission_rate, commission_amount, artist_net, purchased_at, payment_data)
SELECT 8, a.id, s.id, s.curator_id, a.price, s.commission_rate,
       ROUND(a.price * s.commission_rate / 100, 2),
       a.price - ROUND(a.price * s.commission_rate / 100, 2),
       NOW() - INTERVAL '4 days',
       '{"card_brand":"mastercard","card_last4":"5588","cardholder_name":"Nora Whitfield"}'::jsonb
FROM artworks a, showrooms s WHERE a.id = 6 AND s.id = 1;

INSERT INTO orders (buyer_id, artwork_id, room_id, curator_id, gross_price, commission_rate, commission_amount, artist_net, purchased_at, payment_data)
SELECT 7, a.id, s.id, s.curator_id, a.price, s.commission_rate,
       ROUND(a.price * s.commission_rate / 100, 2),
       a.price - ROUND(a.price * s.commission_rate / 100, 2),
       NOW() - INTERVAL '2 days',
       '{"card_brand":"visa","card_last4":"4242","cardholder_name":"Elio Marquez"}'::jsonb
FROM artworks a, showrooms s WHERE a.id = 8 AND s.id = 2;

UPDATE artworks SET status = 'sold' WHERE id IN (1, 2, 5, 6, 8);


INSERT INTO comments (user_id, artwork_id, content) VALUES
(7, 1, 'Absolutely mesmerizing piece, the colors pull you in.'),
(8, 1, 'I keep coming back to look at this one.'),
(5, 2, 'Bold brushwork, love the intensity.'),
(7, 5, 'This belongs in a museum.'),
(4, 6, 'The surreal quality here is stunning.'),
(8, 8, 'So vibrant, makes me want to travel.'),
(7, 9, 'Very calming composition.'),
(6, 3, 'Beautiful restraint in the color palette.');
INSERT INTO ratings (user_id, artwork_id, score) VALUES
(7, 1, 5),
(8, 1, 4),
(7, 5, 5),
(8, 2, 4),
(4, 6, 5),
(8, 8, 4),
(7, 9, 3),
(5, 3, 4);

INSERT INTO saved_items (user_id, item_type, item_id) VALUES
(7, 'artwork',  4),
(8, 'showroom', 1),
(7, 'artist',   5),
(8, 'artist',   4);

INSERT INTO guestbook_entries (room_id, user_id, message) VALUES
(1, 7, 'This showroom feels like stepping into a dream, congrats Anna!'),
(1, 8, 'Loved every piece here.'),
(3, 8, 'Such a peaceful collection, beautifully curated.'),
(2, 4, 'Great energy in this room!');

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('artworks_id_seq', (SELECT MAX(id) FROM artworks));
SELECT setval('showrooms_id_seq', (SELECT MAX(id) FROM showrooms));
SELECT setval('submissions_id_seq', (SELECT MAX(id) FROM submissions));
SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));
SELECT setval('comments_id_seq', (SELECT MAX(id) FROM comments));
SELECT setval('ratings_id_seq', (SELECT MAX(id) FROM ratings));
SELECT setval('saved_items_id_seq', (SELECT MAX(id) FROM saved_items));
SELECT setval('guestbook_entries_id_seq', (SELECT MAX(id) FROM guestbook_entries));
