import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  const bunnyKey = process.env.BUNNY_STREAM_API_KEY;

  if (!accessToken) return res.status(401).json({ error: 'Please sign in as the Nightstream administrator.' });
  if (!supabaseUrl || !publishableKey || !libraryId || !bunnyKey) {
    return res.status(503).json({ error: 'Server setup is incomplete. Check Supabase and Bunny Stream environment variables in Vercel.' });
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });

    const { data: adminRow, error: adminError } = await supabase
      .from('nightstream_admins').select('user_id').eq('user_id', userData.user.id).maybeSingle();
    if (adminError || !adminRow) return res.status(403).json({ error: 'Administrator permission is required.' });

    const title = String(req.body?.title || '').trim().slice(0, 180);
    const description = String(req.body?.description || '').trim().slice(0, 5000);
    const categoryId = String(req.body?.categoryId || '').trim();
    if (!title || !categoryId) return res.status(400).json({ error: 'A video title and category are required.' });

    const categoryCheck = await supabase.from('nightstream_categories').select('id').eq('id', categoryId).maybeSingle();
    if (categoryCheck.error || !categoryCheck.data) return res.status(400).json({ error: 'Choose a valid category.' });

    const bunnyResponse = await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos`, {
      method: 'POST',
      headers: { AccessKey: bunnyKey, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const bunnyData = await bunnyResponse.json().catch(() => ({}));
    if (!bunnyResponse.ok || !bunnyData.guid) {
      return res.status(502).json({ error: 'Bunny Stream could not create the video. Check the library API key and library ID in Vercel.' });
    }

    const slugBase = title.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 140) || 'video';
    const slug = `${slugBase}-${String(bunnyData.guid).slice(0, 8)}`;
    const thumbnailUrl = `https://vz-${libraryId}.b-cdn.net/${bunnyData.guid}/thumbnail.jpg`;
    const { error: insertError } = await supabase.from('nightstream_videos').insert({
      title, slug, description, category_id: categoryId, bunny_video_id: bunnyData.guid,
      thumbnail_url: thumbnailUrl, status: 'processing', created_by: userData.user.id,
    });
    if (insertError) {
      await fetch(`https://video.bunnycdn.com/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(bunnyData.guid)}`, {
        method: 'DELETE', headers: { AccessKey: bunnyKey, Accept: 'application/json' },
      }).catch(() => undefined);
      return res.status(500).json({ error: 'The video record could not be saved. Please try again.' });
    }

    const expires = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
    const signature = createHash('sha256').update(`${libraryId}${bunnyKey}${expires}${bunnyData.guid}`).digest('hex');
    return res.status(200).json({
      videoId: bunnyData.guid,
      libraryId,
      tusEndpoint: 'https://video.bunnycdn.com/tusupload',
      signature,
      expires,
    });
  } catch (error) {
    console.error('Nightstream upload setup failed', error);
    return res.status(500).json({ error: 'Could not start the upload. Please try again.' });
  }
}
