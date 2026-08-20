<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class AIVision_Robots {

    const ALL_BOTS = [
        // Classic search engines
        'Googlebot'           => [ 'name' => 'Google Search',       'type' => 'search', 'url' => 'https://support.google.com/webmasters/answer/1061943' ],
        'Bingbot'             => [ 'name' => 'Bing Search',         'type' => 'search', 'url' => 'https://www.bing.com/webmaster/help/which-crawlers-does-bing-use-8c184ec0' ],
        'DuckDuckBot'         => [ 'name' => 'DuckDuckGo',          'type' => 'search', 'url' => '' ],
        'Slurp'               => [ 'name' => 'Yahoo',               'type' => 'search', 'url' => '' ],
        'Applebot'            => [ 'name' => 'Apple Search',        'type' => 'search', 'url' => 'https://support.apple.com/en-us/119829' ],
        'Googlebot-News'      => [ 'name' => 'Google News',         'type' => 'search', 'url' => '' ],

        // AI Search & Answering Engines (AEO / GEO)
        'GPTBot'              => [ 'name' => 'ChatGPT (OpenAI Training)', 'type' => 'ai', 'url' => 'https://platform.openai.com/docs/gptbot' ],
        'ChatGPT-User'        => [ 'name' => 'ChatGPT Live Browsing',     'type' => 'ai', 'url' => 'https://platform.openai.com/docs/plugins/bot' ],
        'OAI-SearchBot'       => [ 'name' => 'OpenAI SearchBot',          'type' => 'ai', 'url' => 'https://platform.openai.com/docs/bots' ],
        'ClaudeBot'           => [ 'name' => 'Claude (Anthropic)',        'type' => 'ai', 'url' => 'https://www.anthropic.com/policies/usage' ],
        'Claude-Web'          => [ 'name' => 'Claude Live Browsing',      'type' => 'ai', 'url' => '' ],
        'anthropic-ai'        => [ 'name' => 'Anthropic AI Crawler',      'type' => 'ai', 'url' => '' ],
        'PerplexityBot'       => [ 'name' => 'Perplexity AI',             'type' => 'ai', 'url' => 'https://docs.perplexity.ai/guides/bots' ],
        'Google-Extended'     => [ 'name' => 'Google Gemini / Vertex',    'type' => 'ai', 'url' => 'https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers' ],
        'Applebot-Extended'   => [ 'name' => 'Apple Intelligence AI',     'type' => 'ai', 'url' => 'https://support.apple.com/en-us/119829' ],
        'Meta-ExternalAgent'  => [ 'name' => 'Meta AI Crawler',           'type' => 'ai', 'url' => 'https://developers.facebook.com/docs/sharing/webmasters/crawler' ],
        'FacebookBot'         => [ 'name' => 'Facebook AI Bot',           'type' => 'ai', 'url' => '' ],
        'Bytespider'          => [ 'name' => 'ByteDance / Doubao AI',     'type' => 'ai', 'url' => '' ],
        'Amazonbot'           => [ 'name' => 'Amazon Alexa / AI',         'type' => 'ai', 'url' => 'https://developer.amazon.com/amazonbot' ],
        'cohere-ai'           => [ 'name' => 'Cohere AI',                 'type' => 'ai', 'url' => '' ],
        'Diffbot'             => [ 'name' => 'Diffbot Knowledge Graph',   'type' => 'ai', 'url' => '' ],
        'CCBot'               => [ 'name' => 'Common Crawl (Open LLMs)',   'type' => 'ai', 'url' => 'https://commoncrawl.org/ccbot' ],

        // Social Crawlers
        'facebookexternalhit' => [ 'name' => 'Facebook Preview',          'type' => 'social', 'url' => '' ],
        'Twitterbot'          => [ 'name' => 'Twitter / X Preview',       'type' => 'social', 'url' => '' ],
        'LinkedInBot'         => [ 'name' => 'LinkedIn Preview',          'type' => 'social', 'url' => '' ],
        'Pinterestbot'        => [ 'name' => 'Pinterest',                 'type' => 'social', 'url' => '' ],
    ];

    /**
     * Default list of bots allowed for optimal SEO, AEO, and GEO visibility
     */
    const OPTIMAL_ALLOWED_BOTS = [
        'Googlebot', 'Bingbot', 'DuckDuckBot', 'Applebot', 'Googlebot-News',
        'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web',
        'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended',
        'Meta-ExternalAgent', 'FacebookBot', 'Bytespider', 'Amazonbot', 'cohere-ai',
        'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'Pinterestbot'
    ];

    public static function init() {
        // Dynamic robots.txt filter
        add_filter( 'robots_txt', [ __CLASS__, 'filter_robots' ], 20, 2 );

        // Automatically sync on post save/publish and settings save
        add_action( 'save_post', [ __CLASS__, 'auto_sync' ], 20 );
    }

    public static function filter_robots( $output, $public ) {
        if ( ! $public ) return $output;

        // Clean out any existing Sitemap lines to prevent duplication/conflicts
        $output = preg_replace( '/^Sitemap:\s*.*$/mi', '', $output );

        $settings        = get_option( 'aivision_settings', [] );
        $allowed         = $settings['allowed_bots'] ?? self::OPTIMAL_ALLOWED_BOTS;
        $ai_enabled      = isset( $settings['ai_crawlers_enabled'] ) ? ! empty( $settings['ai_crawlers_enabled'] ) : true;
        $disallow_all_ai = ! empty( $settings['block_all_ai'] );

        $extra = "\n# === AIVision SEO — Auto-Optimized Crawler Directives ===\n";

        // Global security & crawler trap rules
        $extra .= "User-agent: *\n";
        $extra .= "Disallow: /wp-admin/\n";
        $extra .= "Allow: /wp-admin/admin-ajax.php\n";
        $extra .= "Allow: /wp-content/uploads/\n";
        $extra .= "Disallow: /xmlrpc.php\n";
        $extra .= "Disallow: /readme.html\n\n";

        foreach ( self::ALL_BOTS as $bot => $info ) {
            if ( $info['type'] === 'ai' ) {
                if ( ! $ai_enabled ) {
                    continue;
                }
                if ( $disallow_all_ai ) {
                    $extra .= "User-agent: {$bot}\nDisallow: /\n\n";
                } elseif ( in_array( $bot, $allowed, true ) ) {
                    $extra .= "User-agent: {$bot}\nAllow: /\n\n";
                } else {
                    $extra .= "User-agent: {$bot}\nDisallow: /\n\n";
                }
            } else {
                // If a search or social bot is not in the allowed list, explicitly disallow it
                if ( ! in_array( $bot, $allowed, true ) ) {
                    $extra .= "User-agent: {$bot}\nDisallow: /\n\n";
                }
            }
        }

        // Add correct sitemap, LLMs, and GEO discovery mapping lines
        $sitemap_url   = home_url( '/sitemap.xml' );
        $llms_txt_url  = home_url( '/llms.txt' );
        $llms_full_url = home_url( '/llms-full.txt' );

        $extra .= "# Sitemaps & AI Content Feeds\n";
        $extra .= "Sitemap: {$sitemap_url}\n";
        $extra .= "# LLM-Text: {$llms_txt_url}\n";
        $extra .= "# LLM-Full: {$llms_full_url}\n";

        return trim( $output ) . "\n" . $extra;
    }

    public static function get_robots_preview() {
        $public = (int) get_option( 'blog_public', 1 );
        $base   = "User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n";
        $output = apply_filters( 'robots_txt', $base, $public );
        return $output;
    }

    /**
     * Apply the recommended Auto-Optimize preset rules
     */
    public static function apply_auto_optimize_preset() {
        $settings = get_option( 'aivision_settings', [] );
        $settings['ai_crawlers_enabled'] = 1;
        $settings['block_all_ai']        = 0;
        $settings['allowed_bots']        = self::OPTIMAL_ALLOWED_BOTS;
        update_option( 'aivision_settings', $settings );

        // Write physical file if possible
        self::write_physical_robots();

        return [
            'success'      => true,
            'message'      => 'robots.txt auto-optimized with best-practice AI & Search rules!',
            'allowed_bots' => self::OPTIMAL_ALLOWED_BOTS,
        ];
    }

    /**
     * Write static robots.txt file to root if writable
     */
    public static function write_physical_robots() {
        $path = rtrim( ABSPATH, '/\\' ) . '/robots.txt';
        $dir  = dirname( $path );

        if ( file_exists( $path ) && is_writable( $dir ) && ! is_writable( $path ) ) {
            @unlink( $path );
        }

        $public  = (int) get_option( 'blog_public', 1 );
        $content = self::filter_robots( '', $public );
        $written = @file_put_contents( $path, $content );

        return [
            'success' => ( $written !== false ),
            'url'     => home_url( '/robots.txt' ),
        ];
    }

    /**
     * Background auto-sync
     */
    public static function auto_sync() {
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
        self::write_physical_robots();
    }
}
