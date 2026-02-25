export interface NewsSource {
  id: number;
  article_title: string;
  original_news_url: string;
  orignal_news_image_url: string | null;
  source_name: string | null;
  country: string | null;
  category: string | null;
  published_date: string | null;
  selected_for_production: boolean;
  orignal_article: string | null;
  keywords_research: string | null;
  llm_keywords: string | null;
  rewritten_headline: string | null;
  rewritten_article: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: "New" | "Under Review" | "Ready to Publish" | "Published";
  instagram_hashtags: string | null;
  instagram_captions: string | null;
  twitter_hashtags: string | null;
  twitter_captions: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ManualImageProduction {
  news_source_id: number;
  title: string;
  content: string | null;
  status: string;
  posted_on_wordpress: boolean;
  posted_date: string | null;
  catogires: string | null;
  highlighted_keywords: string | null;
  image_for_post: string | null;
  image_url: string | null;
  image_owner_name: string | null;
  image: string | null;
  download_link: string | null;
  google_search_query: string | null;
  statistic_template_text: string | null;
  keyword_highlight_template_text: string | null;
  simple_headline_template_text: string | null;
  question_template_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reel {
  news_source_id: number;
  title: string;
  content: string | null;
  posted_on_wordpress: boolean;
  category: string | null;
  status: string;
  video_url: string | null;
  video_owner_name: string | null;
  video_dimension: string | null;
  make_video: boolean;
  final_video: string | null;
  video_without_voice_over: string | null;
  video_overlay_text: string | null;
  reel_cover_image: string | null;
  final_reel_cover_image_view_link: string | null;
  final_reel_cover_download_link: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}
