export type ClipStatus = 'draft' | 'needs_second_review' | 'approved' | 'retired';

export type ClipLiveness = {
  status: ClipStatus;
  live: boolean;
  retired_reason: string | null;
  saint_taken_down: boolean;
  video_embeddable: boolean;
  video_privacy_status: string;
};

/** Why a clip is not in the app, or null when it is live. */
export function notLiveReason(clip: ClipLiveness): string | null {
  if (clip.live) return null;
  if (clip.status === 'draft') return 'Draft';
  if (clip.status === 'needs_second_review') return 'Waiting for a second review';
  if (clip.status === 'retired') return clip.retired_reason ? `Retired: ${clip.retired_reason}` : 'Retired';
  if (clip.saint_taken_down) return 'Saint taken down';
  if (clip.video_privacy_status === 'gone') return 'Video removed from YouTube';
  if (clip.video_privacy_status === 'private') return 'Video is private';
  if (!clip.video_embeddable) return 'Video no longer allows embedding';
  return 'Not live';
}
