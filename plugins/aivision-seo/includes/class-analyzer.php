<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class AIVision_Analyzer {

    // ── 1. Classic SEO Score ──────────────────────────────────────────────────
    public static function seo_score( $post_id, $data ) {
        $checks  = [];
        $content = get_post_field( 'post_content', $post_id );
        $plain   = wp_strip_all_tags( $content );
        $word_count = str_word_count( $plain );
        $keyword = mb_strtolower( trim( $data['focus_keyword'] ?? '' ), 'UTF-8' );

        // Title checks
        $title = $data['meta_title'] ?? get_the_title( $post_id );
        $title_len = mb_strlen( $title );
        $title_lower = mb_strtolower( $title, 'UTF-8' );
        $checks['title_exists']  = self::check( $title_len > 0, 'Meta Title set', 'Add a meta title to your page', 2, 'SEO' );
        $checks['title_length']  = self::check( $title_len >= 40 && $title_len <= 60, 'Title length (40–60 chars)', 'Title is ' . $title_len . ' chars — adjust to 40–60 for search snippets', 2, 'SEO' );
        $checks['title_keyword'] = self::check( $keyword && str_contains( $title_lower, $keyword ), 'Focus keyword in title', 'Include your focus keyword in the title', 2, 'SEO' );

        // Description checks
        $desc     = $data['meta_description'] ?? '';
        $desc_len = mb_strlen( $desc );
        $desc_lower = mb_strtolower( $desc, 'UTF-8' );
        $checks['desc_exists']   = self::check( $desc_len > 0, 'Meta Description set', 'Add a compelling meta description', 2, 'SEO' );
        $checks['desc_length']   = self::check( $desc_len >= 120 && $desc_len <= 158, 'Description length (120–158)', 'Description is ' . $desc_len . ' chars — aim for 120–158 chars', 1, 'SEO' );
        $checks['desc_keyword']  = self::check( $keyword && str_contains( $desc_lower, $keyword ), 'Keyword in description', 'Add your focus keyword to the meta description', 1, 'SEO' );

        // Content & Keyword checks
        $plain_lower = mb_strtolower( $plain, 'UTF-8' );
        $checks['word_count']    = self::check( $word_count >= 600, 'Content ≥ 600 words (' . $word_count . ')', 'Content is ' . $word_count . ' words — aim for 600+ words', 2, 'SEO' );
        $checks['keyword_body']  = self::check( $keyword && str_contains( $plain_lower, $keyword ), 'Keyword in body text', 'Use the focus keyword naturally throughout the body text', 2, 'SEO' );

        // Heading hierarchy
        preg_match_all( '/<h([1-6])[^>]*>(.*?)<\/h\1>/is', $content, $headings );
        $has_h2 = false;
        $h2_with_kw = false;
        foreach ( $headings[1] as $idx => $level ) {
            if ( $level == 2 ) {
                $has_h2 = true;
                if ( $keyword && str_contains( mb_strtolower( $headings[2][$idx], 'UTF-8' ), $keyword ) ) {
                    $h2_with_kw = true;
                }
            }
        }
        $checks['has_h2']        = self::check( $has_h2, 'H2 heading present', 'Add at least one H2 heading to structure your post', 1, 'SEO' );
        $checks['h2_keyword']    = self::check( $h2_with_kw || ! $keyword, 'Keyword in H2 heading', 'Include your focus keyword in at least one H2 heading', 1, 'SEO' );

        // Image alt checks
        preg_match_all( '/<img[^>]+>/i', $content, $imgs );
        $img_count  = count( $imgs[0] );
        $alts_count = 0;
        foreach ( $imgs[0] as $img ) {
            if ( preg_match( '/alt=["\'][^"\']+["\']/i', $img ) ) $alts_count++;
        }
        $checks['img_alts']      = self::check( $img_count === 0 || $alts_count >= $img_count * 0.8, 'Image alt text coverage', 'Add descriptive alt text to all images', 1, 'SEO' );

        // Links
        preg_match_all( '/<a\s[^>]*href=["\'][^"\']+["\']/i', $content, $links );
        $checks['has_links']     = self::check( count($links[0]) > 0, 'Internal/external links present', 'Add internal links to relevant pages on your site', 1, 'SEO' );

        // Keyword density
        $kd = self::keyword_density( $post_id, $keyword );
        $checks['keyword_density'] = self::check( ! $keyword || ( $kd >= 0.5 && $kd <= 2.5 ), 'Keyword density in range (' . $kd . '%)', 'Adjust focus keyword usage (optimal: 0.5%–2.5%)', 1, 'SEO' );

        return self::score_from_checks( $checks );
    }

    // ── 2. Answer Engine Optimization (AEO) Score ────────────────────────────
    public static function aeo_score( $post_id, $data ) {
        $checks  = [];
        $content = get_post_field( 'post_content', $post_id );
        $plain   = wp_strip_all_tags( $content );

        // 1. Question-Led Headings (Interrogative H2/H3s)
        preg_match_all( '/<h([2-3])[^>]*>(.*?)<\/h\1>/is', $content, $h23_matches );
        $question_headings = 0;
        $direct_answer_found = false;

        if ( ! empty( $h23_matches[2] ) ) {
            foreach ( $h23_matches[2] as $idx => $heading_text ) {
                $heading_clean = wp_strip_all_tags( $heading_text );
                if ( preg_match( '/\b(what|how|why|who|when|where|can|is|are|which|best|cost|does|do|vs)\b/i', $heading_clean ) || str_contains( $heading_clean, '?' ) ) {
                    $question_headings++;

                    // Check if followed immediately by a concise direct answer (40–60 words / 200–350 chars)
                    $pattern = '/' . preg_quote( $h23_matches[0][$idx], '/' ) . '\s*<p[^>]*>(.*?)<\/p>/is';
                    if ( preg_match( $pattern, $content, $para_match ) ) {
                        $p_plain = wp_strip_all_tags( $para_match[1] );
                        $p_words = str_word_count( $p_plain );
                        if ( $p_words >= 25 && $p_words <= 65 ) {
                            $direct_answer_found = true;
                        }
                    }
                }
            }
        }

        $checks['question_headings'] = self::check( $question_headings > 0, 'Question-led headings found (' . $question_headings . ')', 'Use question headings (e.g. "What is...", "How to...") to target voice and direct answer boxes', 3, 'AEO' );
        $checks['direct_answer_box'] = self::check( $direct_answer_found, 'Direct answer / snippet paragraph (40–60 words)', 'Add a concise 40–60 word direct answer paragraph immediately under a question heading', 3, 'AEO' );

        // 2. Step-by-Step Numbered Lists (<ol>) for procedural answers
        preg_match_all( '/<ol[^>]*>/i', $content, $ols );
        $checks['ordered_steps']     = self::check( count($ols[0]) > 0, 'Numbered step-by-step list (<ol>)', 'Add numbered step lists (<ol>) for processes and tutorials — highly cited by answer engines', 2, 'AEO' );

        // 3. Structured Bullet Lists (<ul>)
        preg_match_all( '/<ul[^>]*>/i', $content, $uls );
        $checks['bullet_lists']      = self::check( count($uls[0]) > 0, 'Bullet list present', 'Include structured bullet lists for feature comparisons or key points', 2, 'AEO' );

        // 4. Schema FAQPage Presence
        $schemas = $data['schemas'] ?? [];
        $has_faq = false;
        foreach ( $schemas as $s ) {
            if ( str_contains( strtolower( $s['type'] ?? '' ), 'faq' ) ) $has_faq = true;
        }
        $checks['faq_schema']        = self::check( $has_faq, 'FAQPage Schema.org JSON-LD added', 'Add FAQPage schema — the primary structured format for Perplexity and Google Answer Overviews', 3, 'AEO' );

        // 5. Definitions and Explanations
        $has_def = (bool) preg_match( '/\b(what is|means|refers to|is defined as|is a type of|can be defined as)\b/i', $plain );
        $checks['definition_format'] = self::check( $has_def, 'Clear definition pattern found', 'Provide clear "X is defined as..." or "What is X" definitions for quick entity lookup', 2, 'AEO' );

        // 6. Data Tables for quick lookup
        preg_match_all( '/<table[^>]*>/i', $content, $tables );
        $checks['data_tables']       = self::check( count($tables[0]) > 0, 'Data comparison table present', 'Add a comparison or pricing table — answer engines extract table rows for direct answers', 2, 'AEO' );

        return self::score_from_checks( $checks );
    }

    // ── 3. Generative Engine Optimization (GEO) Score ────────────────────────
    public static function geo_score( $post_id, $data ) {
        $checks  = [];
        $content = get_post_field( 'post_content', $post_id );
        $plain   = wp_strip_all_tags( $content );
        $word_count = str_word_count( $plain );

        // 1. Statistical & Numeric Density (Data points, %, numbers)
        preg_match_all( '/\b(\d+([.,]\d+)?%|\$\d+|\€\d+|\£\d+|\b(19\d{2}|20\d{2})\b|\d+\s*(percent|users|patients|cases|studies|implants|clients|years))\b/i', $plain, $stats );
        $stat_count = count( $stats[0] );
        $checks['data_density']      = self::check( $stat_count >= 3, 'Statistical & numeric data points (' . $stat_count . ')', 'Add specific statistics, percentages (%), or data points — LLMs prioritize citing quantitative sources', 3, 'GEO' );

        // 2. Authoritative Outbound Citations
        $host = wp_parse_url( home_url(), PHP_URL_HOST ) ?: '';
        preg_match_all( '/href=["\'](https?:\/\/(?![^"\']*' . preg_quote($host, '/') . ')[^"\']+)["\']/i', $content, $ext_links );
        $ext_count = count( $ext_links[0] );
        $checks['external_citations']= self::check( $ext_count >= 2, 'Authoritative external citations (≥ 2)', 'Cite at least 2 external high-authority studies or reference sources for LLM ground truth', 2, 'GEO' );

        // 3. E-E-A-T & First-Person Experience Signals
        $author_bio = ! empty( $data['author_bio'] );
        $has_first_person = (bool) preg_match( '/\b(in our (test|testing|clinic|practice|experience|study|findings)|we found|we tested|our team|we recommend)\b/i', $plain );
        $checks['author_bio']        = self::check( $author_bio, 'Author bio / expert credentials set', 'Add an author bio with credentials to demonstrate E-E-A-T authority to AI systems', 2, 'GEO' );
        $checks['first_person_exp']  = self::check( $has_first_person, 'First-hand experience indicators', 'Include first-person testing phrases (e.g. "in our clinical testing, we found...") for human E-E-A-T validation', 2, 'GEO' );

        // 4. Sentence Clarity & Token Economy (<=22 words per sentence)
        $sentences  = preg_split( '/(?<=[.!?])\s+/', $plain, -1, PREG_SPLIT_NO_EMPTY );
        $long_sents = array_filter( $sentences, fn($s) => str_word_count($s) > 22 );
        $clarity_pass = count($sentences) > 0 && ( count($long_sents) / count($sentences) ) <= 0.15;
        $checks['sentence_clarity']  = self::check( $clarity_pass, 'Concise sentence structure (≤22 words)', 'Keep sentences concise (≤22 words) — improves synthesis accuracy in LLM context windows', 2, 'GEO' );

        // 5. Deep Knowledge & Comprehensive Word Count (1000+ words)
        $checks['comprehensive_words'] = self::check( $word_count >= 1000, 'Comprehensive content (≥ 1,000 words)', 'Content is ' . $word_count . ' words — comprehensive content (1,000+ words) receives 3.5x more citations in LLMs', 2, 'GEO' );

        // 6. Multi-Schema Knowledge Graph (≥ 2 JSON-LD schemas)
        $schemas = $data['schemas'] ?? [];
        $checks['multi_schema']      = self::check( count($schemas) >= 2, 'Multi-schema graph markup (≥ 2 schemas)', 'Add at least 2 schema types (e.g., Article + FAQPage) for deep entity parsing', 3, 'GEO' );

        // 7. AI Crawler Access in robots.txt
        $settings     = get_option( 'aivision_settings', [] );
        $bots_enabled = ! empty( $settings['ai_crawlers_enabled'] );
        $checks['ai_crawlers']       = self::check( $bots_enabled, 'AI crawlers permitted in robots.txt', 'Enable AI crawler access (GPTBot, Google-Extended, OAI-SearchBot) in AI Crawlers settings', 3, 'GEO' );

        $res = self::score_from_checks( $checks );
        $res['platforms'] = self::platform_scores( array_merge( $checks, [ 'has_faq' => self::check( ! empty( $schemas ), '', '' ) ] ) );
        return $res;
    }

    // ── 4. Unified Prioritized Action Plan ("What to Do") ─────────────────────
    public static function get_action_plan( $post_id, $data ) {
        $seo = self::seo_score( $post_id, $data );
        $aeo = self::aeo_score( $post_id, $data );
        $geo = self::geo_score( $post_id, $data );

        $high_priority   = [];
        $medium_priority = [];
        $passed          = [];

        $all_checks = array_merge(
            $seo['checks'],
            $aeo['checks'],
            $geo['checks']
        );

        foreach ( $all_checks as $key => $check ) {
            $item = [
                'key'         => $key,
                'pillar'      => $check['pillar'] ?? 'SEO',
                'label'       => $check['label'],
                'weight'      => $check['weight'],
                'pass'        => $check['pass'],
            ];

            if ( $check['pass'] ) {
                $passed[] = $item;
            } elseif ( $check['weight'] >= 3 ) {
                $high_priority[] = $item;
            } else {
                $medium_priority[] = $item;
            }
        }

        return [
            'high_priority'   => $high_priority,
            'medium_priority' => $medium_priority,
            'passed'          => $passed,
            'summary'         => [
                'total_actions' => count($high_priority) + count($medium_priority),
                'high_count'    => count($high_priority),
                'med_count'     => count($medium_priority),
                'pass_count'    => count($passed),
            ]
        ];
    }

    // ── Platform Specific Breakdown ──────────────────────────────────────────
    public static function platform_scores( $checks ) {
        return [
            'openai' => self::calc_subscore( $checks, [ 'ai_crawlers', 'multi_schema', 'faq_schema', 'author_bio', 'sentence_clarity', 'bullet_lists', 'comprehensive_words', 'data_density' ] ),
            'gemini' => self::calc_subscore( $checks, [ 'multi_schema', 'author_bio', 'first_person_exp', 'bullet_lists', 'data_tables', 'comprehensive_words', 'external_citations' ] ),
        ];
    }

    private static function calc_subscore( $checks, $keys ) {
        $total  = 0;
        $earned = 0;
        foreach ( $keys as $k ) {
            if ( isset( $checks[$k] ) ) {
                $total  += $checks[$k]['weight'];
                if ( $checks[$k]['pass'] ) {
                    $earned += $checks[$k]['weight'];
                }
            }
        }
        return $total > 0 ? round( ( $earned / $total ) * 100 ) : 0;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static function check( $passes, $pass_label, $fail_label, $weight = 1, $pillar = 'SEO' ) {
        return [
            'pass'   => (bool) $passes,
            'label'  => $passes ? $pass_label : $fail_label,
            'weight' => $weight,
            'pillar' => $pillar,
        ];
    }

    public static function score_from_checks( $checks ) {
        $total  = 0;
        $earned = 0;
        foreach ( $checks as $c ) {
            $total  += $c['weight'];
            if ( $c['pass'] ) $earned += $c['weight'];
        }
        $pct   = $total > 0 ? round( ( $earned / $total ) * 100 ) : 0;
        $grade = self::grade( $pct );
        return [ 'score' => $pct, 'grade' => $grade, 'checks' => $checks, 'earned' => $earned, 'total' => $total ];
    }

    public static function grade( $pct ) {
        if ( $pct >= 80 ) return [ 'label' => 'Excellent', 'color' => '#00b383' ];
        if ( $pct >= 60 ) return [ 'label' => 'Good',      'color' => '#f0a500' ];
        if ( $pct >= 40 ) return [ 'label' => 'Fair',      'color' => '#f06c00' ];
        return                    [ 'label' => 'Poor',      'color' => '#e03e2d' ];
    }

    public static function keyword_density( $post_id, $keyword ) {
        if ( ! $keyword ) return 0;
        $plain   = wp_strip_all_tags( get_post_field( 'post_content', $post_id ) );
        $words   = str_word_count( $plain );
        if ( $words === 0 ) return 0;
        $kw_clean = trim( $keyword );
        $kw_lower = mb_strtolower( $kw_clean, 'UTF-8' );
        $plain_lower = mb_strtolower( $plain, 'UTF-8' );
        $count   = substr_count( $plain_lower, $kw_lower );
        $kw_word_count = max( 1, str_word_count( $kw_clean ) );
        return round( ( ( $count * $kw_word_count ) / $words ) * 100, 2 );
    }
}
