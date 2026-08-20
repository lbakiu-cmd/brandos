<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class AIVision_Schema {

    public static function templates() {
        return [
            'FAQPage'          => 'FAQ Page',
            'Article'          => 'Article / Blog Post',
            'BlogPosting'      => 'Blog Posting',
            'LocalBusiness'    => 'Local Business',
            'Product'          => 'Product',
            'Service'          => 'Service',
            'HowTo'            => 'How-To Guide',
            'BreadcrumbList'   => 'Breadcrumb',
            'Organization'     => 'Organization',
            'Person'           => 'Person (Author / Expert)',
            'WebSite'          => 'Website + Sitelinks Search',
            'Review'           => 'Review',
            'Event'            => 'Event',
            'VideoObject'      => 'Video',
        ];
    }

    public static function generate( $type, $post_id, $extra = [] ) {
        $title   = get_the_title( $post_id );
        $url     = get_permalink( $post_id );
        $date    = get_the_date( 'c', $post_id );
        $mod     = get_the_modified_date( 'c', $post_id );
        $excerpt = get_the_excerpt( $post_id );

        $author_id  = get_post_field( 'post_author', $post_id );
        $author     = get_the_author_meta( 'display_name', $author_id );
        $author_url = get_author_posts_url( $author_id );

        $logo    = get_site_icon_url( 60 );
        $site    = get_bloginfo( 'name' );
        $site_url = get_home_url();

        switch ( $type ) {
            case 'FAQPage':
                $faqs = $extra['faqs'] ?? [];
                if ( empty( $faqs ) && $post_id ) {
                    $content = get_post_field( 'post_content', $post_id );
                    // 1. Check for H2/H3 question patterns (e.g. <h2>How long does it take?</h2><p>It takes...</p>)
                    if ( preg_match_all( '/<h[23][^>]*>(.*?\?.*?)<\/h[23]>(.*?)(?=<h[23]|$)/is', $content, $matches, PREG_SET_ORDER ) ) {
                        foreach ( array_slice( $matches, 0, 8 ) as $m ) {
                            $q = trim( wp_strip_all_tags( $m[1] ) );
                            $a = trim( wp_strip_all_tags( $m[2] ) );
                            if ( ! empty( $q ) && ! empty( $a ) ) {
                                $faqs[] = [ 'q' => $q, 'a' => mb_substr( $a, 0, 500, 'UTF-8' ) ];
                            }
                        }
                    }
                    // 2. Check for details/summary accordion elements
                    if ( empty( $faqs ) && preg_match_all( '/<summary[^>]*>(.*?)<\/summary>(.*?)(?=<\/details>|$)/is', $content, $matches, PREG_SET_ORDER ) ) {
                        foreach ( array_slice( $matches, 0, 8 ) as $m ) {
                            $q = trim( wp_strip_all_tags( $m[1] ) );
                            $a = trim( wp_strip_all_tags( $m[2] ) );
                            if ( ! empty( $q ) && ! empty( $a ) ) {
                                $faqs[] = [ 'q' => $q, 'a' => mb_substr( $a, 0, 500, 'UTF-8' ) ];
                            }
                        }
                    }
                }
                if ( empty( $faqs ) ) {
                    $faqs = [ [ 'q' => 'What is an example question?', 'a' => 'This is an example answer.' ] ];
                }
                $main = array_map( fn($f) => [
                    '@type'          => 'Question',
                    'name'           => $f['q'],
                    'acceptedAnswer' => [ '@type' => 'Answer', 'text' => $f['a'] ],
                ], $faqs );
                return [ '@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $main ];

            case 'Article':
            case 'BlogPosting':
                return [
                    '@context'         => 'https://schema.org',
                    '@type'            => $type,
                    'headline'         => $title,
                    'description'      => $excerpt,
                    'url'              => $url,
                    'datePublished'    => $date,
                    'dateModified'     => $mod,
                    'author'           => [
                        '@type' => 'Person',
                        'name'  => $extra['author'] ?? $author,
                        'url'   => $extra['author_url'] ?? $author_url,
                    ],
                    'publisher'        => [ '@type' => 'Organization', 'name' => $site, 'logo' => [ '@type' => 'ImageObject', 'url' => $logo ] ],
                    'image'            => $extra['image'] ?? get_the_post_thumbnail_url( $post_id, 'full' ),
                    'mainEntityOfPage' => [ '@type' => 'WebPage', '@id' => $url ],
                ];

            case 'LocalBusiness':
                $settings  = get_option( 'aivision_settings', [] );
                $site_type = $settings['site_type'] ?? 'general';

                $default_type = 'LocalBusiness';
                if ( $site_type === 'medical' )          $default_type = 'MedicalBusiness';
                elseif ( $site_type === 'legal' )        $default_type = 'LegalService';
                elseif ( $site_type === 'restaurant' )   $default_type = 'Restaurant';
                elseif ( $site_type === 'realestate' )   $default_type = 'RealEstateAgent';
                elseif ( $site_type === 'homeservices' ) $default_type = 'HomeAndConstructionBusiness';
                elseif ( $site_type === 'financial' )    $default_type = 'FinancialService';
                elseif ( $site_type === 'ecommerce' )    $default_type = 'Store';
                elseif ( $site_type === 'professional' ) $default_type = 'ProfessionalService';

                $biz = [
                    '@context'      => 'https://schema.org',
                    '@type'         => $extra['biz_type'] ?? $default_type,
                    'name'          => $extra['biz_name']  ?? $site,
                    'url'           => $extra['biz_url']   ?? $site_url,
                    'telephone'     => $extra['phone']     ?? '',
                    'email'         => $extra['email']     ?? '',
                    'address'       => [
                        '@type'           => 'PostalAddress',
                        'streetAddress'   => $extra['street']      ?? '',
                        'addressLocality' => $extra['city']        ?? '',
                        'postalCode'      => $extra['postal_code'] ?? '',
                        'addressCountry'  => $extra['country']     ?? '',
                    ],
                    'openingHours'  => $extra['hours']     ?? [ 'Mo-Fr 09:00-18:00' ],
                    'image'         => $extra['image']     ?? $logo,
                    'priceRange'    => $extra['price']     ?? '$$',
                ];

                if ( ! empty( $extra['latitude'] ) && ! empty( $extra['longitude'] ) ) {
                    $biz['geo'] = [
                        '@type'     => 'GeoCoordinates',
                        'latitude'  => (float) $extra['latitude'],
                        'longitude' => (float) $extra['longitude'],
                    ];
                }

                if ( ! empty( $extra['area_served'] ) ) {
                    $biz['areaServed'] = $extra['area_served'];
                }

                $spec = $extra['medical_specialty'] ?? '';
                if ( ! empty( $spec ) ) {
                    $biz['medicalSpecialty'] = $spec;
                }

                return $biz;

            case 'HowTo':
                $steps = $extra['steps'] ?? [];
                if ( empty( $steps ) && $post_id ) {
                    $content = get_post_field( 'post_content', $post_id );
                    if ( preg_match_all( '/<li[^>]*>(.*?)<\/li>/is', $content, $matches ) && count( $matches[1] ) >= 2 ) {
                        $idx = 1;
                        foreach ( array_slice( $matches[1], 0, 6 ) as $li ) {
                            $text = trim( wp_strip_all_tags( $li ) );
                            if ( ! empty( $text ) ) {
                                $steps[] = [ 'name' => "Step {$idx}", 'text' => $text ];
                                $idx++;
                            }
                        }
                    }
                }
                if ( empty( $steps ) ) {
                    $steps = [ [ 'name' => 'Step 1', 'text' => 'Description of step 1.' ] ];
                }
                return [
                    '@context'     => 'https://schema.org',
                    '@type'        => 'HowTo',
                    'name'         => $extra['how_name']  ?? $title,
                    'description'  => $extra['how_desc']  ?? $excerpt,
                    'totalTime'    => $extra['total_time'] ?? 'PT30M',
                    'step'         => array_map( fn($s, $i) => [
                        '@type'    => 'HowToStep',
                        'position' => $i + 1,
                        'name'     => $s['name'],
                        'text'     => $s['text'],
                    ], $steps, array_keys($steps) ),
                ];

            case 'Product':
                return [
                    '@context'    => 'https://schema.org',
                    '@type'       => 'Product',
                    'name'        => $extra['prod_name']  ?? $title,
                    'description' => $extra['prod_desc']  ?? $excerpt,
                    'image'       => $extra['image']      ?? get_the_post_thumbnail_url( $post_id, 'full' ),
                    'brand'       => [ '@type' => 'Brand', 'name' => $extra['brand'] ?? $site ],
                    'offers'      => [
                        '@type'         => 'Offer',
                        'priceCurrency' => $extra['currency'] ?? 'ALL',
                        'price'         => $extra['price']    ?? '0',
                        'availability'  => 'https://schema.org/InStock',
                        'url'           => $url,
                    ],
                ];

            case 'Service':
                return [
                    '@context'    => 'https://schema.org',
                    '@type'       => 'Service',
                    'name'        => $extra['svc_name']  ?? $title,
                    'description' => $extra['svc_desc']  ?? $excerpt,
                    'provider'    => [ '@type' => 'Organization', 'name' => $extra['provider'] ?? $site, 'url' => $site_url ],
                    'areaServed'  => $extra['area']      ?? '',
                    'serviceType' => $extra['svc_type']  ?? '',
                    'url'         => $url,
                ];

            case 'BreadcrumbList':
                $crumbs = $extra['crumbs'] ?? [
                    [ 'name' => 'Home', 'url' => $site_url ],
                    [ 'name' => $title, 'url' => $url ],
                ];
                return [
                    '@context'        => 'https://schema.org',
                    '@type'           => 'BreadcrumbList',
                    'itemListElement' => array_map( fn($c, $i) => [
                        '@type'    => 'ListItem',
                        'position' => $i + 1,
                        'name'     => $c['name'],
                        'item'     => $c['url'],
                    ], $crumbs, array_keys($crumbs) ),
                ];

            case 'Organization':
                return [
                    '@context'    => 'https://schema.org',
                    '@type'       => 'Organization',
                    'name'        => $extra['org_name']  ?? $site,
                    'url'         => $site_url,
                    'logo'        => $logo,
                    'sameAs'      => $extra['same_as']   ?? [],
                    'contactPoint' => [[
                        '@type'       => 'ContactPoint',
                        'telephone'   => $extra['phone'] ?? '',
                        'contactType' => 'customer service',
                    ]],
                ];

            case 'WebSite':
                return [
                    '@context'        => 'https://schema.org',
                    '@type'           => 'WebSite',
                    'name'            => $site,
                    'url'             => $site_url,
                    'dateCreated'     => $extra['date_created']  ?? $date,
                    'dateModified'    => $extra['date_modified'] ?? $mod,
                    'potentialAction' => [
                        '@type'       => 'SearchAction',
                        'target'      => [ '@type' => 'EntryPoint', 'urlTemplate' => $site_url . '/?s={search_term_string}' ],
                        'query-input' => 'required name=search_term_string',
                    ],
                ];

            case 'Review':
                return [
                    '@context'    => 'https://schema.org',
                    '@type'       => 'Review',
                    'reviewRating' => [
                        '@type'       => 'Rating',
                        'ratingValue' => $extra['rating']  ?? '5',
                        'bestRating'  => '5',
                    ],
                    'name'         => $title,
                    'author'       => [ '@type' => 'Person', 'name' => $extra['reviewer'] ?? $author ],
                    'itemReviewed' => [ '@type' => 'Thing',  'name' => $extra['item']     ?? '' ],
                    'reviewBody'   => $extra['body']       ?? $excerpt,
                ];

            case 'Event':
                return [
                    '@context'   => 'https://schema.org',
                    '@type'      => 'Event',
                    'name'       => $extra['evt_name']    ?? $title,
                    'startDate'  => $extra['start_date']  ?? $date,
                    'endDate'    => $extra['end_date']    ?? $date,
                    'location'   => [
                        '@type'   => 'Place',
                        'name'    => $extra['venue']      ?? '',
                        'address' => $extra['evt_address'] ?? '',
                    ],
                    'description' => $extra['evt_desc']  ?? $excerpt,
                    'organizer'  => [ '@type' => 'Organization', 'name' => $site, 'url' => $site_url ],
                    'url'        => $url,
                ];

            case 'VideoObject':
                return [
                    '@context'        => 'https://schema.org',
                    '@type'           => 'VideoObject',
                    'name'            => $extra['vid_name']  ?? $title,
                    'description'     => $extra['vid_desc']  ?? $excerpt,
                    'thumbnailUrl'    => $extra['thumbnail']  ?? '',
                    'uploadDate'      => $date,
                    'contentUrl'      => $extra['content_url'] ?? $url,
                    'embedUrl'        => $extra['embed_url']   ?? '',
                    'duration'        => $extra['duration']    ?? 'PT5M',
                ];

            case 'Person':
                $person_name = $extra['person_name'] ?? ($author ?: $site);
                $person_data = [
                    '@context'       => 'https://schema.org',
                    '@type'          => 'Person',
                    'name'           => $person_name,
                    'jobTitle'       => $extra['job_title']   ?? '',
                ];
                if ( ! empty( $extra['alumni_of'] ) ) {
                    $person_data['alumniOf'] = [
                        '@type' => 'CollegeOrUniversity',
                        'name'  => $extra['alumni_of'],
                    ];
                }
                if ( ! empty( $extra['credentials'] ) ) {
                    $person_data['hasCredential'] = $extra['credentials'];
                }
                if ( ! empty( $extra['knows_about'] ) ) {
                    $person_data['knowsAbout'] = $extra['knows_about'];
                }
                if ( ! empty( $extra['experience'] ) || ! empty( $extra['responsibilities'] ) ) {
                    $person_data['workExperience'] = [
                        '@type'                  => 'Occupation',
                        'experienceRequirements' => $extra['experience'] ?? '',
                        'responsibilities'       => $extra['responsibilities'] ?? '',
                    ];
                }
                return $person_data;

            default:
                return [ '@context' => 'https://schema.org', '@type' => $type ];
        }
    }

    public static function validate_json( $json_string ) {
        $decoded = json_decode( $json_string );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            return [ 'valid' => false, 'error' => json_last_error_msg() ];
        }
        $obj = (array) $decoded;
        $errors = [];
        if ( empty( $obj['@context'] ) ) $errors[] = 'Missing @context';
        if ( empty( $obj['@type'] ) )    $errors[] = 'Missing @type';
        return [ 'valid' => empty($errors), 'errors' => $errors ];
    }
}
