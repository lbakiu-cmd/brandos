<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class AIVision_Metabox {

    public static function init() {
        add_action( 'add_meta_boxes',  [ __CLASS__, 'register' ] );
        add_action( 'save_post',       [ __CLASS__, 'save' ], 10, 2 );
        add_action( 'wp_ajax_aivision_analyze',          [ __CLASS__, 'ajax_analyze' ] );
        add_action( 'wp_ajax_aivision_generate_schema',  [ __CLASS__, 'ajax_generate_schema' ] );
        add_action( 'wp_ajax_aivision_get_post_schemas', [ __CLASS__, 'ajax_get_post_schemas' ] );
        add_action( 'wp_ajax_aivision_save_schema',      [ __CLASS__, 'ajax_save_schema' ] );
        add_action( 'wp_ajax_aivision_delete_schema',    [ __CLASS__, 'ajax_delete_schema' ] );
    }

    public static function register() {
        $types = get_post_types( [ 'public' => true ] );
        foreach ( $types as $type ) {
            add_meta_box( 'aivision-seo-box', '🎯 AIVision — SEO, AEO & GEO Optimizer', [ __CLASS__, 'render' ], $type, 'normal', 'high' );
        }
    }

    public static function render( $post ) {
        wp_nonce_field( 'aivision_save_meta', 'aivision_nonce' );
        $data     = get_post_meta( $post->ID, AIVISION_META_KEY, true ) ?: [];
        $schemas  = $data['schemas'] ?? [];
        $settings = get_option( 'aivision_settings', [] );
        $default_robots = $settings['default_robots'] ?? 'index, follow';

        $meta_title   = $data['meta_title']       ?? '';
        $meta_desc    = $data['meta_description'] ?? '';
        $focus_kw     = $data['focus_keyword']    ?? '';
        $meta_robots  = $data['meta_robots']      ?? $default_robots;
        $og_image     = $data['og_image']         ?? '';
        $author_bio   = $data['author_bio']       ?? '';

        // Pre-compute 3-Pillar scores & Action Plan
        $seo = AIVision_Analyzer::seo_score( $post->ID, $data );
        $aeo = AIVision_Analyzer::aeo_score( $post->ID, $data );
        $geo = AIVision_Analyzer::geo_score( $post->ID, $data );
        $action_plan = AIVision_Analyzer::get_action_plan( $post->ID, $data );
        $kd  = AIVision_Analyzer::keyword_density( $post->ID, $focus_kw );
        ?>
        <div id="aivision-metabox">
            <!-- Tabs -->
            <div class="av-tabs">
                <button type="button" class="av-tab av-tab-active" data-tab="seo">📊 SEO (<?php echo esc_html($seo['score']); ?>%)</button>
                <button type="button" class="av-tab" data-tab="aeo">💬 AEO (<?php echo esc_html($aeo['score']); ?>%)</button>
                <button type="button" class="av-tab" data-tab="geo">🤖 GEO (<?php echo esc_html($geo['score']); ?>%)</button>
                <button type="button" class="av-tab av-tab-highlight" data-tab="actionplan">💡 Action Plan (<?php echo esc_html($action_plan['summary']['total_actions']); ?>)</button>
                <button type="button" class="av-tab" data-tab="schema">🏷️ Schema</button>
                <button type="button" class="av-tab" data-tab="social">📣 Social</button>
                <button type="button" class="av-tab" data-tab="advanced">⚙️ Advanced</button>
            </div>

            <!-- SEO Tab -->
            <div class="av-tab-content av-tab-content-active" data-tab="seo">
                <div class="av-two-col">
                    <!-- Left: fields -->
                    <div class="av-fields">
                        <div class="av-field-group">
                            <label>Focus Keyword</label>
                            <input type="text" name="aivision[focus_keyword]" value="<?php echo esc_attr($focus_kw); ?>" placeholder="e.g. emergency plumber, cosmetic dentist, or family lawyer" id="av-focus-keyword">
                            <?php if ($kd > 0) : ?>
                            <span class="av-hint">Keyword density: <strong><?php echo esc_html($kd); ?>%</strong> <?php echo ($kd >= 0.5 && $kd <= 2.5) ? '✅ Optimal' : ($kd < 0.5 ? '⚠️ Too low' : '⚠️ Too high'); ?></span>
                            <?php endif; ?>
                        </div>
                        <div class="av-field-group">
                            <label>
                                Meta Title
                                <span class="av-char-count" id="av-title-count"><?php echo mb_strlen($meta_title); ?>/60</span>
                            </label>
                            <input type="text" name="aivision[meta_title]" value="<?php echo esc_attr($meta_title); ?>" placeholder="<?php echo esc_attr(get_the_title($post->ID)); ?>" id="av-meta-title" maxlength="70">
                            <div class="av-char-bar"><div class="av-char-fill" id="av-title-bar" style="width:<?php echo min(100, round(mb_strlen($meta_title)/60*100)); ?>%"></div></div>
                        </div>
                        <div class="av-field-group">
                            <label>
                                Meta Description
                                <span class="av-char-count" id="av-desc-count"><?php echo mb_strlen($meta_desc); ?>/158</span>
                            </label>
                            <textarea name="aivision[meta_description]" rows="3" placeholder="Describe this page for search engines (120–158 chars)..." id="av-meta-desc" maxlength="200"><?php echo esc_textarea($meta_desc); ?></textarea>
                            <div class="av-char-bar"><div class="av-char-fill" id="av-desc-bar" style="width:<?php echo min(100, round(mb_strlen($meta_desc)/158*100)); ?>%"></div></div>
                        </div>
                    </div>
                    <!-- Right: Score -->
                    <div class="av-score-panel">
                        <div class="av-score-circle av-score-circle-seo" style="--score-color:<?php echo esc_attr($seo['grade']['color']); ?>">
                            <svg viewBox="0 0 36 36">
                                <path class="av-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <path class="av-score-fill" stroke="<?php echo esc_attr($seo['grade']['color']); ?>" stroke-dasharray="<?php echo esc_attr($seo['score']); ?>, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <text x="18" y="20.35" class="av-score-text"><?php echo esc_html($seo['score']); ?></text>
                            </svg>
                            <div class="av-score-label">Classic SEO</div>
                            <div class="av-score-grade" style="color:<?php echo esc_attr($seo['grade']['color']); ?>"><?php echo esc_html($seo['grade']['label']); ?></div>
                        </div>
                        <button type="button" class="av-btn av-btn-secondary av-btn-full" id="av-analyze-btn" data-post-id="<?php echo esc_attr($post->ID); ?>">↺ Re-analyze Content</button>
                    </div>
                </div>

                <!-- SEO Checklist -->
                <div class="av-checklist" id="av-seo-checklist">
                    <div class="av-checklist-header">Search Engine Optimization (SEO) Checklist</div>
                    <?php foreach ( $seo['checks'] as $key => $check ) : ?>
                    <div class="av-check av-check-<?php echo $check['pass'] ? 'pass' : 'fail'; ?>">
                        <span class="av-check-icon"><?php echo $check['pass'] ? '✅' : '❌'; ?></span>
                        <span><?php echo esc_html($check['label']); ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- AEO Tab (Answer Engine Optimization) -->
            <div class="av-tab-content" data-tab="aeo">
                <div class="av-two-col">
                    <div class="av-fields">
                        <div class="av-aeo-intro">
                            <p><strong>Answer Engine Optimization (AEO)</strong> prepares your content to win <strong>Google Featured Snippets</strong>, <strong>Voice Search Answers</strong> (Siri, Alexa), and <strong>Direct Answer Boxes</strong> in AI Overviews &amp; Perplexity.</p>
                            <div class="av-tip-box">
                                <strong>💡 AEO Quick Rule:</strong> Add question H2/H3s (e.g. <em>"What is..."</em>, <em>"How much does... cost?"</em>) and place a direct 40–60 word answer directly below it.
                            </div>
                        </div>
                    </div>
                    <div class="av-score-panel">
                        <div class="av-score-circle av-score-circle-aeo" style="--score-color:<?php echo esc_attr($aeo['grade']['color']); ?>">
                            <svg viewBox="0 0 36 36">
                                <path class="av-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <path class="av-score-fill" stroke="<?php echo esc_attr($aeo['grade']['color']); ?>" stroke-dasharray="<?php echo esc_attr($aeo['score']); ?>, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <text x="18" y="20.35" class="av-score-text"><?php echo esc_html($aeo['score']); ?></text>
                            </svg>
                            <div class="av-score-label">AEO Answer Score</div>
                            <div class="av-score-grade" style="color:<?php echo esc_attr($aeo['grade']['color']); ?>"><?php echo esc_html($aeo['grade']['label']); ?></div>
                        </div>
                    </div>
                </div>

                <div class="av-checklist" id="av-aeo-checklist">
                    <div class="av-checklist-header">Answer Engine Optimization (AEO) Checklist</div>
                    <?php foreach ( $aeo['checks'] as $key => $check ) : ?>
                    <div class="av-check av-check-<?php echo $check['pass'] ? 'pass' : 'fail'; ?>">
                        <span class="av-check-icon"><?php echo $check['pass'] ? '✅' : '❌'; ?></span>
                        <span class="<?php echo $check['weight'] >= 3 ? 'av-check-important' : ''; ?>"><?php echo esc_html($check['label']); ?> <?php echo $check['weight'] >= 3 ? '<span class="av-badge-high">High Impact</span>' : ''; ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- GEO Tab (Generative Engine Optimization) -->
            <div class="av-tab-content" data-tab="geo">
                <div class="av-two-col">
                    <div class="av-fields">
                        <div class="av-ai-intro">
                            <p><strong>Generative Engine Optimization (GEO)</strong> evaluates how well your content is synthesized, cited, and referenced by LLMs like ChatGPT, Claude, Perplexity, and Gemini.</p>
                        </div>
                        <div class="av-field-group">
                            <label>Author Bio / Expertise (E-E-A-T Signal)</label>
                            <textarea name="aivision[author_bio]" rows="2" placeholder="Brief author credentials &amp; background for E-E-A-T signals..."><?php echo esc_textarea($author_bio); ?></textarea>
                            <span class="av-hint">Author expertise signals trust and human authority to LLMs</span>
                        </div>
                    </div>
                    <div class="av-score-panel">
                        <div class="av-score-circle av-score-circle-geo" style="--score-color:<?php echo esc_attr($geo['grade']['color']); ?>">
                            <svg viewBox="0 0 36 36">
                                <path class="av-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <path class="av-score-fill" stroke="<?php echo esc_attr($geo['grade']['color']); ?>" stroke-dasharray="<?php echo esc_attr($geo['score']); ?>, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                                <text x="18" y="20.35" class="av-score-text"><?php echo esc_html($geo['score']); ?></text>
                            </svg>
                            <div class="av-score-label">GEO LLM Score</div>
                            <div class="av-score-grade" style="color:<?php echo esc_attr($geo['grade']['color']); ?>"><?php echo esc_html($geo['grade']['label']); ?></div>
                        </div>
                    </div>
                </div>

                <!-- Platform Visibility Scores -->
                <div class="av-platforms-section">
                    <div class="av-platforms-header">LLM Platform Readiness Breakdown</div>
                    <div class="av-platforms-grid">
                        <div class="av-platform-card" data-platform="perplexity">
                            <div class="av-platform-icon">🔍</div>
                            <div class="av-platform-info">
                                <div class="av-platform-name">Perplexity</div>
                                <div class="av-platform-score"><span id="av-score-perplexity"><?php echo esc_html($geo['platforms']['perplexity'] ?? 0); ?></span>%</div>
                            </div>
                        </div>
                        <div class="av-platform-card" data-platform="claude">
                            <div class="av-platform-icon">💬</div>
                            <div class="av-platform-info">
                                <div class="av-platform-name">Claude</div>
                                <div class="av-platform-score"><span id="av-score-claude"><?php echo esc_html($geo['platforms']['claude'] ?? 0); ?></span>%</div>
                            </div>
                        </div>
                        <div class="av-platform-card" data-platform="gemini">
                            <div class="av-platform-icon">✨</div>
                            <div class="av-platform-info">
                                <div class="av-platform-name">Gemini</div>
                                <div class="av-platform-score"><span id="av-score-gemini"><?php echo esc_html($geo['platforms']['gemini'] ?? 0); ?></span>%</div>
                            </div>
                        </div>
                        <div class="av-platform-card" data-platform="openai">
                            <div class="av-platform-icon">🧠</div>
                            <div class="av-platform-info">
                                <div class="av-platform-name">OpenAI</div>
                                <div class="av-platform-score"><span id="av-score-openai"><?php echo esc_html($geo['platforms']['openai'] ?? 0); ?></span>%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="av-checklist" id="av-geo-checklist">
                    <div class="av-checklist-header">Generative Engine Optimization (GEO) Checklist</div>
                    <?php foreach ( $geo['checks'] as $key => $check ) : ?>
                    <div class="av-check av-check-<?php echo $check['pass'] ? 'pass' : 'fail'; ?>">
                        <span class="av-check-icon"><?php echo $check['pass'] ? '✅' : '❌'; ?></span>
                        <span class="<?php echo $check['weight'] >= 3 ? 'av-check-important' : ''; ?>"><?php echo esc_html($check['label']); ?> <?php echo $check['weight'] >= 3 ? '<span class="av-badge-high">High Impact</span>' : ''; ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>

            <!-- Action Plan Tab ("What to Do") -->
            <div class="av-tab-content" data-tab="actionplan">
                <div class="av-actionplan-header">
                    <h2>💡 Prioritized Action Plan — What To Do</h2>
                    <p>Follow these high-impact recommendations to rapidly boost your content for Search Engines, Answer Engines, and AI Citations.</p>
                </div>

                <div id="av-actionplan-container">
                    <?php if ( ! empty($action_plan['high_priority']) ) : ?>
                    <div class="av-plan-section">
                        <div class="av-plan-section-title av-text-red">🔴 High Priority (Immediate Ranking &amp; AI Citation Boosters)</div>
                        <div class="av-plan-cards">
                            <?php foreach ( $action_plan['high_priority'] as $item ) : ?>
                            <div class="av-plan-card av-plan-high">
                                <div class="av-plan-badge av-badge-red"><?php echo esc_html($item['pillar']); ?></div>
                                <div class="av-plan-text">
                                    <strong><?php echo esc_html($item['label']); ?></strong>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <?php endif; ?>

                    <?php if ( ! empty($action_plan['medium_priority']) ) : ?>
                    <div class="av-plan-section" style="margin-top:16px;">
                        <div class="av-plan-section-title av-text-orange">🟡 Medium Priority (Structure &amp; Depth Enhancements)</div>
                        <div class="av-plan-cards">
                            <?php foreach ( $action_plan['medium_priority'] as $item ) : ?>
                            <div class="av-plan-card av-plan-med">
                                <div class="av-plan-badge av-badge-orange"><?php echo esc_html($item['pillar']); ?></div>
                                <div class="av-plan-text">
                                    <strong><?php echo esc_html($item['label']); ?></strong>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <?php endif; ?>

                    <?php if ( ! empty($action_plan['passed']) ) : ?>
                    <div class="av-plan-section" style="margin-top:16px;">
                        <div class="av-plan-section-title av-text-green">🟢 Passed / Optimized Factors (<?php echo count($action_plan['passed']); ?> Passed)</div>
                        <div class="av-plan-cards av-plan-passed-cards">
                            <?php foreach ( $action_plan['passed'] as $item ) : ?>
                            <div class="av-plan-card av-plan-good">
                                <div class="av-plan-badge av-badge-green"><?php echo esc_html($item['pillar']); ?></div>
                                <div class="av-plan-text">
                                    <span>✅ <?php echo esc_html($item['label']); ?></span>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Schema Tab -->
            <div class="av-tab-content" data-tab="schema">
                <div class="av-schema-actions">
                    <select id="av-new-schema-type">
                        <?php foreach ( AIVision_Schema::templates() as $k => $v ) echo '<option value="' . esc_attr($k) . '">' . esc_html($v) . '</option>'; ?>
                    </select>
                    <button type="button" class="av-btn av-btn-primary" id="av-add-schema" data-post-id="<?php echo esc_attr($post->ID); ?>">+ Add Schema</button>
                </div>

                <div id="av-schemas-list">
                    <?php if ( empty($schemas) ) : ?>
                    <div class="av-empty-schemas">
                        <p>🏷️ No schemas yet. Add structured JSON-LD schemas above to boost AEO and GEO scores.</p>
                    </div>
                    <?php else : ?>
                    <?php foreach ( $schemas as $i => $schema ) : ?>
                    <div class="av-schema-item" data-index="<?php echo esc_attr($i); ?>" data-type="<?php echo esc_attr($schema['type'] ?? ''); ?>">
                        <div class="av-schema-item-header">
                            <span class="av-schema-type-badge"><?php echo esc_html($schema['type']); ?></span>
                            <div class="av-schema-item-actions">
                                <button type="button" class="av-btn av-btn-sm av-btn-secondary av-schema-view-toggle" style="display:none">Code View</button>
                                <button type="button" class="av-btn av-btn-sm av-schema-toggle">Edit ▾</button>
                                <button type="button" class="av-btn av-btn-sm av-btn-danger av-schema-delete" data-post-id="<?php echo esc_attr($post->ID); ?>" data-index="<?php echo esc_attr($i); ?>">Remove</button>
                            </div>
                        </div>
                        <div class="av-schema-item-body" style="display:none">
                            <div class="av-schema-gui-container"></div>
                            <div class="av-schema-code-container" style="display:none">
                                <textarea class="av-code" rows="12" name="aivision[schemas][<?php echo esc_attr($i); ?>][json]"><?php echo esc_textarea($schema['json'] ?? ''); ?></textarea>
                            </div>
                            <input type="hidden" name="aivision[schemas][<?php echo esc_attr($i); ?>][type]" value="<?php echo esc_attr($schema['type'] ?? ''); ?>">
                        </div>
                    </div>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Social Tab -->
            <div class="av-tab-content" data-tab="social">
                <div class="av-field-group">
                    <label>Open Graph Image URL</label>
                    <input type="url" name="aivision[og_image]" value="<?php echo esc_url($og_image); ?>" placeholder="https://example.com/image.jpg" id="av-og-image">
                    <button type="button" class="av-btn av-btn-sm av-mt-sm" id="av-og-image-picker">Choose from Media Library</button>
                    <?php if ($og_image) : ?>
                    <img src="<?php echo esc_url($og_image); ?>" class="av-og-preview" alt="OG Preview">
                    <?php endif; ?>
                    <span class="av-hint">Recommended: 1200×630px. Used by Google, Facebook, Twitter, LinkedIn, and AI crawlers.</span>
                </div>
                <div class="av-field-group">
                    <label>Twitter / X Card Type</label>
                    <select name="aivision[twitter_card]">
                        <option value="summary_large_image" <?php selected($data['twitter_card'] ?? '', 'summary_large_image'); ?>>Summary with Large Image</option>
                        <option value="summary" <?php selected($data['twitter_card'] ?? '', 'summary'); ?>>Summary</option>
                    </select>
                </div>
            </div>

            <!-- Advanced Tab -->
            <div class="av-tab-content" data-tab="advanced">
                <div class="av-field-group">
                    <label>Robots Meta Tag</label>
                    <select name="aivision[meta_robots]">
                        <?php $opts = ['index, follow','noindex, follow','index, nofollow','noindex, nofollow'];
                        foreach ( $opts as $o ) echo '<option value="' . esc_attr($o) . '"' . selected($meta_robots,$o,false) . '>' . esc_html($o) . '</option>'; ?>
                    </select>
                </div>
                <div class="av-field-group">
                    <label>Canonical URL <span class="av-hint-inline">(leave blank for auto)</span></label>
                    <input type="url" name="aivision[canonical]" value="<?php echo esc_url($data['canonical'] ?? ''); ?>" placeholder="<?php echo esc_url(get_permalink($post->ID)); ?>">
                </div>
            </div>

            <!-- Preview Bar -->
            <div class="av-preview-section">
                <div class="av-preview-label">SERP &amp; Snippet Preview</div>
                <div class="av-serp-preview">
                    <div class="av-serp-url"><?php echo esc_url(get_permalink($post->ID)); ?></div>
                    <div class="av-serp-title" id="av-preview-title"><?php echo esc_html($meta_title ?: get_the_title($post->ID)); ?></div>
                    <div class="av-serp-desc"  id="av-preview-desc"><?php echo esc_html($meta_desc ?: get_the_excerpt($post->ID)); ?></div>
                </div>
            </div>
        </div>
        <?php
    }

    public static function save( $post_id, $post ) {
        if ( ! isset($_POST['aivision_nonce']) || ! wp_verify_nonce($_POST['aivision_nonce'], 'aivision_save_meta') ) return;
        if ( defined('DOING_AUTOSAVE') && DOING_AUTOSAVE ) return;
        if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) return;
        if ( ! current_user_can('edit_post', $post_id) ) return;

        if ( ! isset($_POST['aivision']) || ! is_array($_POST['aivision']) ) return;

        $raw  = $_POST['aivision'];
        $data = get_post_meta( $post_id, AIVISION_META_KEY, true ) ?: [];
        $settings = get_option( 'aivision_settings', [] );
        $default_robots = $settings['default_robots'] ?? 'index, follow';

        $data['meta_title']       = sanitize_text_field( $raw['meta_title']       ?? '' );
        $data['meta_description'] = sanitize_textarea_field( $raw['meta_description'] ?? '' );
        $data['focus_keyword']    = sanitize_text_field( $raw['focus_keyword']    ?? '' );
        $data['meta_robots']      = sanitize_text_field( $raw['meta_robots']      ?? $default_robots );
        $data['canonical']        = esc_url_raw(         $raw['canonical']        ?? '' );
        $data['og_image']         = esc_url_raw(         $raw['og_image']         ?? '' );
        $data['twitter_card']     = sanitize_text_field( $raw['twitter_card']     ?? 'summary_large_image' );
        $data['author_bio']       = sanitize_textarea_field( $raw['author_bio']   ?? '' );

        if ( isset($raw['schemas']) && is_array($raw['schemas']) ) {
            $schemas = [];
            foreach ( $raw['schemas'] as $s ) {
                if ( ! empty($s['json']) ) {
                    $json_str = wp_unslash( $s['json'] );
                    $decoded  = json_decode( $json_str, true );
                    if ( json_last_error() === JSON_ERROR_NONE && is_array($decoded) ) {
                        $clean_json = wp_json_encode( $decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
                        $schemas[] = [
                            'type' => sanitize_text_field( $s['type'] ?? 'Custom' ),
                            'json' => $clean_json,
                        ];
                    } else {
                        $schemas[] = [
                            'type' => sanitize_text_field( $s['type'] ?? 'Custom' ),
                            'json' => $json_str,
                        ];
                    }
                }
            }
            $data['schemas'] = $schemas;
        } else {
            $data['schemas'] = [];
        }

        update_post_meta( $post_id, AIVISION_META_KEY, $data );
    }

    public static function ajax_analyze() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        $post_id = absint( $_POST['post_id'] ?? 0 );
        if ( ! $post_id ) wp_send_json_error();
        if ( ! current_user_can( 'edit_post', $post_id ) ) wp_send_json_error( 'Unauthorized' );
        $data = get_post_meta( $post_id, AIVISION_META_KEY, true ) ?: [];

        if ( isset( $_POST['current_data'] ) && is_array( $_POST['current_data'] ) ) {
            $raw = $_POST['current_data'];
            $data['meta_title']       = sanitize_text_field( $raw['meta_title']       ?? '' );
            $data['meta_description'] = sanitize_textarea_field( $raw['meta_description'] ?? '' );
            $data['focus_keyword']    = sanitize_text_field( $raw['focus_keyword']    ?? '' );
            $data['author_bio']       = sanitize_textarea_field( $raw['author_bio']   ?? '' );
        }

        $seo = AIVision_Analyzer::seo_score( $post_id, $data );
        $aeo = AIVision_Analyzer::aeo_score( $post_id, $data );
        $geo = AIVision_Analyzer::geo_score( $post_id, $data );
        $action_plan = AIVision_Analyzer::get_action_plan( $post_id, $data );

        wp_send_json_success([
            'seo'         => $seo,
            'aeo'         => $aeo,
            'geo'         => $geo,
            'action_plan' => $action_plan,
            'platforms'   => $geo['platforms'] ?? [],
        ]);
    }

    public static function ajax_generate_schema() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        $post_id = absint( $_POST['post_id'] ?? 0 );
        if ( ! $post_id ) wp_send_json_error();
        if ( ! current_user_can( 'edit_post', $post_id ) ) wp_send_json_error( 'Unauthorized' );
        $type    = sanitize_text_field( $_POST['type'] ?? 'Article' );
        $obj     = AIVision_Schema::generate( $type, $post_id );
        $json    = json_encode( $obj, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
        wp_send_json_success([ 'json' => $json, 'type' => $type ]);
    }

    public static function ajax_save_schema() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        $post_id = absint( $_POST['post_id'] ?? 0 );
        if ( ! $post_id ) wp_send_json_error();
        if ( ! current_user_can( 'edit_post', $post_id ) ) wp_send_json_error( 'Unauthorized' );

        $json = wp_unslash( $_POST['json'] ?? '' );
        $decoded = json_decode( $json, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            wp_send_json_error( 'Invalid JSON: ' . json_last_error_msg() );
        }

        $type    = sanitize_text_field( $_POST['type'] ?? 'Custom' );

        $data    = get_post_meta( $post_id, AIVISION_META_KEY, true ) ?: [];
        $schemas = $data['schemas'] ?? [];
        $schemas[] = [ 'type' => $type, 'json' => $json ];
        $data['schemas'] = $schemas;
        update_post_meta( $post_id, AIVISION_META_KEY, $data );

        $index = count($schemas) - 1;
        wp_send_json_success([ 'index' => $index, 'type' => $type, 'json' => $json ]);
    }

    public static function ajax_get_post_schemas() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        $post_id = absint( $_POST['post_id'] ?? 0 );
        if ( ! $post_id ) wp_send_json_error( 'Invalid post ID' );
        if ( ! current_user_can( 'edit_post', $post_id ) ) wp_send_json_error( 'Unauthorized' );

        $data    = get_post_meta( $post_id, AIVISION_META_KEY, true ) ?: [];
        $schemas = $data['schemas'] ?? [];

        wp_send_json_success( [
            'post_id' => $post_id,
            'title'   => get_the_title( $post_id ),
            'count'   => count( $schemas ),
            'schemas' => $schemas,
        ] );
    }

    public static function ajax_delete_schema() {
        check_ajax_referer( 'aivision_nonce', 'nonce' );
        $post_id = absint( $_POST['post_id'] ?? 0 );
        if ( ! $post_id ) wp_send_json_error();
        if ( ! current_user_can( 'edit_post', $post_id ) ) wp_send_json_error( 'Unauthorized' );
        $index   = absint( $_POST['index']   ?? 0 );

        $data    = get_post_meta( $post_id, AIVISION_META_KEY, true ) ?: [];
        $schemas = array_values( $data['schemas'] ?? [] );
        array_splice( $schemas, $index, 1 );
        $data['schemas'] = $schemas;
        update_post_meta( $post_id, AIVISION_META_KEY, $data );
        wp_send_json_success();
    }
}
