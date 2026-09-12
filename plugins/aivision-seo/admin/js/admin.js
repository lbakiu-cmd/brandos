/* global aiVision, jQuery */
(function ($) {
    'use strict';

    const { ajax_url, nonce } = aiVision;

    // ── Utility ───────────────────────────────────────────────────────────────
    function request(action, data, cb) {
        $.post(ajax_url, { action, nonce, ...data }, cb).fail(function (xhr, status, error) {
            notify('Request failed: ' + (error || status || 'Server error'), 'error');
            if (typeof cb === 'function') {
                cb({ success: false, data: error || status });
            }
        });
    }
    function notify(msg, type = 'success') {
        const cls  = type === 'success' ? '#00b383' : '#e03e2d';
        const $n   = $('<div>').css({
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
            background: cls, color: '#fff', padding: '10px 18px',
            borderRadius: '8px', fontWeight: 600, fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0,0,0,.2)', transition: 'opacity .4s',
        }).text(msg).appendTo('body');
        setTimeout(() => $n.css('opacity', 0), 2000);
        setTimeout(() => $n.remove(), 2500);
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────
    $(document).on('click', '.av-tab', function () {
        const tab = $(this).data('tab');
        $('.av-tab').removeClass('av-tab-active');
        $(this).addClass('av-tab-active');
        $('.av-tab-content').removeClass('av-tab-content-active');
        $('[data-tab="' + tab + '"].av-tab-content').addClass('av-tab-content-active');
    });

    // ── Admin page tabs ───────────────────────────────────────────────────────
    $(document).on('click', '.aivision-tab', function () {
        const tab = $(this).data('tab');
        $('.aivision-tab').removeClass('aivision-tab-active');
        $(this).addClass('aivision-tab-active');
        $('.aivision-tab-panel').hide();
        $('#av-panel-' + tab).show();
    });

    // ── SERP live preview ─────────────────────────────────────────────────────
    $(document).on('input', '#av-meta-title', function () {
        const val = $(this).val();
        const len = val.length;
        $('#av-title-count').text(len + '/60');
        $('#av-preview-title').text(val);
        const pct = Math.min(100, Math.round((len / 60) * 100));
        $('#av-title-bar').css('width', pct + '%')
            .css('background', len < 30 ? '#f0a500' : len <= 60 ? '#00b383' : '#e03e2d');
    });

    $(document).on('input', '#av-meta-desc', function () {
        const val = $(this).val();
        const len = val.length;
        $('#av-desc-count').text(len + '/158');
        $('#av-preview-desc').text(val);
        const pct = Math.min(100, Math.round((len / 158) * 100));
        $('#av-desc-bar').css('width', pct + '%')
            .css('background', len < 80 ? '#f0a500' : len <= 158 ? '#00b383' : '#e03e2d');
    });

    // ── Re-analyze (SEO, AEO, GEO & Action Plan) ──────────────────────────────
    $(document).on('click', '#av-analyze-btn', function () {
        const postId = $(this).data('post-id');
        const $btn   = $(this).text('Analyzing…').prop('disabled', true);

        // Grab current unsaved form values to analyze in real-time
        const current_data = {
            focus_keyword: $('#av-focus-keyword').val(),
            meta_title: $('#av-meta-title').val(),
            meta_description: $('#av-meta-desc').val(),
            author_bio: $('textarea[name="aivision[author_bio]"]').val()
        };

        request('aivision_analyze', { post_id: postId, current_data }, function (res) {
            $btn.text('↺ Re-analyze Content').prop('disabled', false);
            if (!res.success) return notify('Analysis failed.', 'error');

            const { seo, aeo, geo, action_plan, platforms } = res.data;

            // Update Tab Labels with Live Percentages
            $('.av-tab[data-tab="seo"]').text(`📊 SEO (${seo.score}%)`);
            $('.av-tab[data-tab="aeo"]').text(`💬 AEO (${aeo.score}%)`);
            $('.av-tab[data-tab="geo"]').text(`🤖 GEO (${geo.score}%)`);
            $('.av-tab[data-tab="actionplan"]').text(`💡 Action Plan (${action_plan.summary.total_actions})`);

            // Update Checklists
            renderChecklist('#av-seo-checklist', seo, 'Search Engine Optimization (SEO) Checklist');
            renderChecklist('#av-aeo-checklist', aeo, 'Answer Engine Optimization (AEO) Checklist');
            renderChecklist('#av-geo-checklist', geo, 'Generative Engine Optimization (GEO) Checklist');

            // Update Score Circles
            updateScoreCircle('.av-score-circle-seo', seo);
            updateScoreCircle('.av-score-circle-aeo', aeo);
            updateScoreCircle('.av-score-circle-geo', geo);

            // Update LLM Platform breakdown
            if (platforms) {
                $('#av-score-openai').text(platforms.openai || 0);
                $('#av-score-gemini').text(platforms.gemini || 0);
            }

            // Render Prioritized Action Plan
            renderActionPlan('#av-actionplan-container', action_plan);

            notify('Analysis & Action Plan updated!');
        });
    });

    function renderChecklist(selector, result, title) {
        const { checks } = result;
        let html = '<div class="av-checklist-header">' + title + '</div>';
        Object.values(checks).forEach(c => {
            const cls  = c.pass ? 'av-check-pass' : 'av-check-fail';
            const icon = c.pass ? '✅' : '❌';
            const hi   = c.weight >= 3 && !c.pass ? ' <span class="av-badge-high">High Impact</span>' : '';
            html += `<div class="av-check ${cls}"><span class="av-check-icon">${icon}</span><span>${escHtml(c.label)}${hi}</span></div>`;
        });
        $(selector).html(html);
    }

    function renderActionPlan(selector, plan) {
        let html = '';

        if (plan.high_priority && plan.high_priority.length > 0) {
            html += '<div class="av-plan-section">';
            html += '<div class="av-plan-section-title av-text-red">🔴 High Priority (Immediate Ranking & AI Citation Boosters)</div>';
            html += '<div class="av-plan-cards">';
            plan.high_priority.forEach(item => {
                html += `
                <div class="av-plan-card av-plan-high">
                    <div class="av-plan-badge av-badge-red">${escHtml(item.pillar)}</div>
                    <div class="av-plan-text">
                        <strong>${escHtml(item.label)}</strong>
                    </div>
                </div>`;
            });
            html += '</div></div>';
        }

        if (plan.medium_priority && plan.medium_priority.length > 0) {
            html += '<div class="av-plan-section" style="margin-top:16px;">';
            html += '<div class="av-plan-section-title av-text-orange">🟡 Medium Priority (Structure & Depth Enhancements)</div>';
            html += '<div class="av-plan-cards">';
            plan.medium_priority.forEach(item => {
                html += `
                <div class="av-plan-card av-plan-med">
                    <div class="av-plan-badge av-badge-orange">${escHtml(item.pillar)}</div>
                    <div class="av-plan-text">
                        <strong>${escHtml(item.label)}</strong>
                    </div>
                </div>`;
            });
            html += '</div></div>';
        }

        if (plan.passed && plan.passed.length > 0) {
            html += '<div class="av-plan-section" style="margin-top:16px;">';
            html += `<div class="av-plan-section-title av-text-green">🟢 Passed / Optimized Factors (${plan.passed.length} Passed)</div>`;
            html += '<div class="av-plan-cards av-plan-passed-cards">';
            plan.passed.forEach(item => {
                html += `
                <div class="av-plan-card av-plan-good">
                    <div class="av-plan-badge av-badge-green">${escHtml(item.pillar)}</div>
                    <div class="av-plan-text">
                        <span>✅ ${escHtml(item.label)}</span>
                    </div>
                </div>`;
            });
            html += '</div></div>';
        }

        if (!html) {
            html = '<div class="av-empty-schemas"><p>🎉 All SEO, AEO, and GEO checks are fully passing! Your content is optimized for search engines and generative AI.</p></div>';
        }

        $(selector).html(html);
    }

    function updateScoreCircle($el, result) {
        const circle = typeof $el === 'string' ? $($el) : $el;
        if (!circle.length) return;
        const score  = result.score;
        const color  = result.grade.color;
        circle.css('--score-color', color);
        circle.find('.av-score-fill').attr('stroke', color).attr('stroke-dasharray', score + ', 100');
        circle.find('.av-score-text').text(score);
        circle.find('.av-score-grade').css('color', color).text(result.grade.label);
    }

    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Schema — Add ─────────────────────────────────────────────────────────
    $(document).on('click', '#av-add-schema', function () {
        const postId = $(this).data('post-id');
        const type   = $('#av-new-schema-type').val();
        const $btn   = $(this).text('Generating…').prop('disabled', true);
        request('aivision_generate_schema', { post_id: postId, type }, function (res) {
            $btn.text('+ Add Schema').prop('disabled', false);
            if (!res.success) return notify('Failed to generate schema.', 'error');
            request('aivision_save_schema', { post_id: postId, type: res.data.type, json: res.data.json }, function (saveRes) {
                if (!saveRes.success) return notify('Failed to save schema.', 'error');
                const idx = saveRes.data.index;
                appendSchemaItem(postId, idx, res.data.type, res.data.json);
                notify('Schema added!');
            });
        });
    });

    function appendSchemaItem(postId, index, type, json) {
        const $empty = $('.av-empty-schemas');
        if ($empty.length) $empty.remove();
        const html = `
        <div class="av-schema-item" data-index="${index}" data-type="${escHtml(type)}">
            <div class="av-schema-item-header">
                <span class="av-schema-type-badge">${escHtml(type)}</span>
                <div class="av-schema-item-actions">
                    <button type="button" class="av-btn av-btn-sm av-btn-secondary av-schema-view-toggle" style="display:none">Code View</button>
                    <button type="button" class="av-btn av-btn-sm av-btn-secondary av-schema-toggle">Edit ▾</button>
                    <button type="button" class="av-btn av-btn-sm av-btn-danger av-schema-delete" data-post-id="${postId}" data-index="${index}">Remove</button>
                </div>
            </div>
            <div class="av-schema-item-body" style="display:none">
                <div class="av-schema-gui-container"></div>
                <div class="av-schema-code-container" style="display:none">
                    <textarea class="av-code" rows="12" name="aivision[schemas][${index}][json]">${escHtml(json)}</textarea>
                </div>
                <input type="hidden" name="aivision[schemas][${index}][type]" value="${escHtml(type)}">
            </div>
        </div>`;
        const $item = $(html).appendTo('#av-schemas-list');
        initSchemaGui($item);
    }

    // Schema — toggle body
    $(document).on('click', '.av-schema-toggle', function () {
        const $item = $(this).closest('.av-schema-item');
        const $body = $item.find('.av-schema-item-body');
        const $viewToggle = $item.find('.av-schema-view-toggle');
        const open  = $body.is(':visible');
        
        $body.slideToggle(200, function() {
            if ($body.is(':visible') && $item.find('.av-schema-gui-container').children().length > 0) {
                $viewToggle.show();
            } else {
                $viewToggle.hide();
            }
        });
        $(this).text(open ? 'Edit ▾' : 'Close ▴');
    });

    // Schema — toggle view (GUI vs Code)
    $(document).on('click', '.av-schema-view-toggle', function () {
        const $item = $(this).closest('.av-schema-item');
        const $gui = $item.find('.av-schema-gui-container');
        const $code = $item.find('.av-schema-code-container');
        const isGuiVisible = $gui.is(':visible');
        if (isGuiVisible) {
            $gui.hide();
            $code.show();
            $(this).text('Form View');
        } else {
            const jsonStr = $item.find('textarea.av-code').val();
            try {
                const parsed = JSON.parse(jsonStr);
                renderGuiForm($item, parsed);
                $code.hide();
                $gui.show();
                $(this).text('Code View');
            } catch (e) {
                alert('Invalid JSON! Please fix errors in JSON code before switching back to Form View.\n\nError: ' + e.message);
            }
        }
    });

    // Helper to normalize schema type across various naming conventions and Schema.org subtypes
    function normalizeSchemaType(rawType) {
        if (!rawType) return 'Custom';
        const t = String(rawType).trim();
        const clean = t.replace(/[\s\-_]/g, '').toLowerCase();

        if (clean === 'faqpage' || clean === 'faq') return 'FAQPage';
        if (clean === 'article' || clean === 'blogposting' || clean === 'newsarticle' || clean === 'techarticle') return 'Article';
        if (clean === 'howto' || clean === 'howtoguide') return 'HowTo';
        if (clean === 'product') return 'Product';
        if (clean === 'service' || clean === 'medicalprocedure') return 'Service';
        if (clean === 'breadcrumblist' || clean === 'breadcrumb' || clean === 'breadcrumbs') return 'BreadcrumbList';
        if (clean === 'organization' || clean === 'corporation') return 'Organization';
        if (clean === 'website') return 'WebSite';
        if (clean === 'review') return 'Review';
        if (clean === 'event') return 'Event';
        if (clean === 'videoobject' || clean === 'video') return 'VideoObject';
        if (clean === 'person') return 'Person';

        // LocalBusiness and known medical / business subtypes
        const localBizSubtypes = [
            'localbusiness', 'dentist', 'medicalbusiness', 'medicalclinic',
            'physician', 'hospital', 'dentalclinic', 'store', 'restaurant',
            'professionalservice', 'healthandbeautybusiness', 'emergencyservice'
        ];
        if (localBizSubtypes.includes(clean)) return 'LocalBusiness';

        return t;
    }

    // Helper to generate schema form fields
    function createFieldHtml(label, name, value, placeholder = '', fieldType = 'text') {
        const inputHtml = fieldType === 'textarea' 
            ? `<textarea class="av-gui-input" data-name="${name}" rows="3" placeholder="${placeholder}">${escHtml(value || '')}</textarea>`
            : `<input type="${fieldType}" class="av-gui-input" data-name="${name}" value="${escHtml(value || '')}" placeholder="${placeholder}">`;
        
        return `
        <div class="av-gui-field-group">
            <label>${label}</label>
            ${inputHtml}
        </div>`;
    }

    // Initialize Schema GUI
    function initSchemaGui($item) {
        const $textarea = $item.find('textarea.av-code');
        const jsonStr = $textarea.val();
        let data = {};
        
        try {
            data = JSON.parse(jsonStr || '{}');
        } catch (e) {
            $item.find('.av-schema-code-container').show();
            return;
        }

        const rawType = $item.attr('data-type') || data['@type'] || $item.data('type');
        const type = normalizeSchemaType(rawType);
        
        const supportedTypes = [
            'FAQPage', 'Article', 'BlogPosting', 'LocalBusiness', 
            'HowTo', 'Product', 'Service', 'BreadcrumbList', 'Organization', 
            'Person', 'WebSite', 'Review', 'Event', 'VideoObject'
        ];

        if (supportedTypes.includes(type)) {
            renderGuiForm($item, data);
            $item.find('.av-schema-gui-container').show();
            $item.find('.av-schema-code-container').hide();
            $item.find('.av-schema-view-toggle').text('Code View');
            if ($item.find('.av-schema-item-body').is(':visible')) {
                $item.find('.av-schema-view-toggle').show();
            }
        } else {
            $item.find('.av-schema-code-container').show();
            $item.find('.av-schema-view-toggle').hide();
        }
    }

    // Render Form GUI Based on Schema JSON-LD Data
    function renderGuiForm($item, data) {
        if (!data || typeof data !== 'object') {
            try { data = JSON.parse(data); } catch(e) { data = {}; }
        }
        const rawType = $item.attr('data-type') || data['@type'] || $item.data('type');
        const type = normalizeSchemaType(rawType);
        let html = '';

        switch (type) {
            case 'FAQPage':
                let faqs = [];
                if (data.mainEntity && Array.isArray(data.mainEntity)) {
                    faqs = data.mainEntity.map(q => ({
                        q: q.name || '',
                        a: (q.acceptedAnswer && q.acceptedAnswer.text) || ''
                    }));
                }
                if (faqs.length === 0) faqs = [{ q: '', a: '' }];

                let faqsHtml = '';
                faqs.forEach((faq, idx) => {
                    faqsHtml += `
                    <div class="av-gui-repeater-item av-faq-item" data-index="${idx}">
                        <div class="av-gui-repeater-item-header">
                            <span>Question #${idx + 1}</span>
                            <button type="button" class="av-gui-btn-remove av-btn-remove-faq">&times; Remove</button>
                        </div>
                        ${createFieldHtml('Question', 'q', faq.q, 'e.g. What is your return policy?')}
                        ${createFieldHtml('Answer', 'a', faq.a, 'e.g. We accept returns within 30 days.', 'textarea')}
                    </div>`;
                });

                html = `
                <div class="av-gui-form" data-type="FAQPage">
                    <div class="av-gui-repeater-list av-faq-list">
                        ${faqsHtml}
                    </div>
                    <button type="button" class="av-btn av-btn-secondary av-btn-sm av-btn-add-faq">+ Add Question</button>
                </div>`;
                break;

            case 'Article':
            case 'BlogPosting':
                const author = (data.author && data.author.name) || '';
                const authorUrl = (data.author && data.author.url) || '';
                const publisher = (data.publisher && data.publisher.name) || '';
                const image = typeof data.image === 'string' ? data.image : ((data.image && data.image.url) || '');
                
                html = `
                <div class="av-gui-form" data-type="${type}">
                    ${createFieldHtml('Headline', 'headline', data.headline || '')}
                    ${createFieldHtml('Description', 'description', data.description || '', '', 'textarea')}
                    <div class="av-gui-row">
                        ${createFieldHtml('Author Name', 'author_name', author)}
                        ${createFieldHtml('Author URL', 'author_url', authorUrl, 'e.g. https://example.com/author')}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('Publisher Name', 'publisher_name', publisher)}
                        ${createFieldHtml('Image URL', 'image', image)}
                    </div>
                </div>`;
                break;

            case 'LocalBusiness':
                const bizType = data['@type'] || 'LocalBusiness';
                const street = (data.address && data.address.streetAddress) || 'Rruga e Durresit';
                const city = (data.address && data.address.addressLocality) || 'Tirana';
                const postal = (data.address && data.address.postalCode) || '1001';
                const country = (data.address && data.address.addressCountry) || 'AL';
                const spec = data.medicalSpecialty || '';
 
                let catalogName = '';
                let catalogItems = [];
                if (data.hasOfferCatalog) {
                    catalogName = data.hasOfferCatalog.name || '';
                    if (data.hasOfferCatalog.itemListElement && Array.isArray(data.hasOfferCatalog.itemListElement)) {
                        catalogItems = data.hasOfferCatalog.itemListElement.map(item => ({
                            type: item['@type'] || (['MedicalBusiness', 'Dentist', 'Hospital', 'MedicalClinic'].includes(bizType) ? 'MedicalProcedure' : 'Service'),
                            name: item.name || '',
                            description: item.description || ''
                        }));
                    }
                }
 
                let catalogHtml = '';
                catalogItems.forEach((item, idx) => {
                    catalogHtml += `
                    <div class="av-gui-repeater-item av-catalog-item" data-index="${idx}">
                        <div class="av-gui-repeater-item-header">
                            <span>Service/Procedure #${idx + 1}</span>
                            <button type="button" class="av-gui-btn-remove av-btn-remove-catalog-item">&times; Remove</button>
                        </div>
                        <input type="hidden" class="av-gui-input" data-name="catalog_item_type" value="${escHtml(item.type)}">
                        ${createFieldHtml('Item Name', 'catalog_item_name', item.name, 'e.g. Calculus Cleaning')}
                        ${createFieldHtml('Item Description', 'catalog_item_desc', item.description, 'Describe the service...', 'textarea')}
                    </div>`;
                });
 
                html = `
                <div class="av-gui-form" data-type="LocalBusiness">
                    <div class="av-gui-row">
                        ${createFieldHtml('Business Type (@type)', 'biz_type', bizType, 'e.g. LocalBusiness, Dentist')}
                        ${createFieldHtml('Business Name', 'biz_name', data.name || '')}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('Website URL', 'biz_url', data.url || '')}
                        ${createFieldHtml('Phone Number', 'phone', data.telephone || '')}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('Email Address', 'email', data.email || '')}
                        ${createFieldHtml('Street Address', 'street', street)}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('City / Locality', 'city', city)}
                        ${createFieldHtml('Postal Code', 'postal_code', postal)}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('Country Code', 'country', country, 'e.g. US, AL')}
                        ${createFieldHtml('Price Range', 'price', data.priceRange || '', 'e.g. $$')}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('Image URL', 'image', data.image || '')}
                        ${createFieldHtml('Specialty', 'medical_specialty', spec, 'e.g. Dentistry, Legal (leave blank if none)')}
                    </div>
                    <div class="av-gui-field-group">
                        <label>Offer Catalog Name</label>
                        <input type="text" class="av-gui-input" data-name="catalog_name" value="${escHtml(catalogName)}" placeholder="e.g. Featured Services (leave blank if no catalog)">
                    </div>
                    <div class="av-gui-repeater-list av-catalog-list">
                        ${catalogHtml}
                    </div>
                    <button type="button" class="av-btn av-btn-secondary av-btn-sm av-btn-add-catalog-item">+ Add Catalog Item</button>
                </div>`;
                break;

            case 'HowTo':
                let steps = [];
                if (data.step && Array.isArray(data.step)) {
                    steps = data.step.map(s => ({
                        name: s.name || '',
                        text: s.text || ''
                    }));
                }
                if (steps.length === 0) steps = [{ name: '', text: '' }];

                let stepsHtml = '';
                steps.forEach((step, idx) => {
                    stepsHtml += `
                    <div class="av-gui-repeater-item av-howto-step" data-index="${idx}">
                        <div class="av-gui-repeater-item-header">
                            <span>Step #${idx + 1}</span>
                            <button type="button" class="av-gui-btn-remove av-btn-remove-step">&times; Remove</button>
                        </div>
                        ${createFieldHtml('Step Name', 'step_name', step.name, 'e.g. Prepare the materials')}
                        ${createFieldHtml('Step Text / Description', 'step_text', step.text, 'e.g. Lay out all items on a clean surface.', 'textarea')}
                    </div>`;
                });

                html = `
                <div class="av-gui-form" data-type="HowTo">
                    <div class="av-gui-row">
                        ${createFieldHtml('How-To Title', 'how_name', data.name || '')}
                        ${createFieldHtml('Total Time', 'total_time', data.totalTime || '', 'e.g. PT30M')}
                    </div>
                    ${createFieldHtml('Description', 'how_desc', data.description || '', '', 'textarea')}
                    <div class="av-gui-repeater-list av-howto-list">
                        ${stepsHtml}
                    </div>
                    <button type="button" class="av-btn av-btn-secondary av-btn-sm av-btn-add-howto-step">+ Add Step</button>
                </div>`;
                break;

            case 'Product':
                let offers = {};
                if (data.offers) {
                    offers = Array.isArray(data.offers) ? data.offers[0] || {} : data.offers;
                }
                const brand = (data.brand && data.brand.name) || '';

                html = `
                <div class="av-gui-form" data-type="Product">
                    <div class="av-gui-row">
                        ${createFieldHtml('Product Name', 'prod_name', data.name || '')}
                        ${createFieldHtml('Brand Name', 'brand', brand)}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('Price', 'price', offers.price || '', 'e.g. 99.99')}
                        ${createFieldHtml('Currency', 'currency', offers.priceCurrency || 'USD', 'e.g. USD, EUR, GBP')}
                    </div>
                    ${createFieldHtml('Description', 'prod_desc', data.description || '', '', 'textarea')}
                    ${createFieldHtml('Product Image URL', 'image', data.image || '')}
                </div>`;
                break;

            case 'Service':
                let servicesList = [];
                let sharedProvider = '';
                let sharedArea = '';

                if (Array.isArray(data)) {
                    servicesList = data;
                } else if (data && typeof data === 'object') {
                    if (data['@type'] === 'Service' || data['@type'] === 'MedicalProcedure') {
                        servicesList = [data];
                    }
                    sharedProvider = (data.provider && (data.provider.name || data.provider)) || '';
                    sharedArea = data.areaServed || '';
                }

                if (servicesList.length === 0) {
                    servicesList = [{ name: '', description: '', type: 'Service' }];
                }

                let servicesHtml = '';
                servicesList.forEach((svc, idx) => {
                    servicesHtml += `
                    <div class="av-gui-repeater-item av-service-item" data-index="${idx}">
                        <div class="av-gui-repeater-item-header">
                            <span>Service #${idx + 1}</span>
                            <button type="button" class="av-gui-btn-remove av-btn-remove-service">&times; Remove</button>
                        </div>
                        ${createFieldHtml('Service Name', 'svc_name', svc.name, 'e.g. Emergency Roof Repair or Dental Cleaning')}
                        ${createFieldHtml('Service Description', 'svc_desc', svc.description, 'Describe the service...', 'textarea')}
                        ${createFieldHtml('Service Type', 'svc_type', svc.type, 'e.g. RoofingContractor, LegalService, or MedicalProcedure')}
                    </div>`;
                });

                html = `
                <div class="av-gui-form" data-type="Service">
                    <div class="av-gui-row">
                        ${createFieldHtml('Provider Name', 'provider', sharedProvider, 'e.g. Apex Legal Services or City Dental')}
                        ${createFieldHtml('Area Served', 'area', sharedArea, 'e.g. Greater London, Chicago, or Seattle')}
                    </div>
                    <div class="av-gui-repeater-list av-service-list">
                        ${servicesHtml}
                    </div>
                    <button type="button" class="av-btn av-btn-secondary av-btn-sm av-btn-add-service">+ Add Service</button>
                </div>`;
                break;

            case 'BreadcrumbList':
                let crumbs = [];
                if (data.itemListElement && Array.isArray(data.itemListElement)) {
                    crumbs = data.itemListElement.map(c => ({
                        name: c.name || '',
                        url: c.item || ''
                    }));
                }
                if (crumbs.length === 0) crumbs = [{ name: '', url: '' }];

                let crumbsHtml = '';
                crumbs.forEach((crumb, idx) => {
                    crumbsHtml += `
                    <div class="av-gui-repeater-item av-breadcrumb-item" data-index="${idx}">
                        <div class="av-gui-repeater-item-header">
                            <span>Breadcrumb #${idx + 1}</span>
                            <button type="button" class="av-gui-btn-remove av-btn-remove-crumb">&times; Remove</button>
                        </div>
                        <div class="av-gui-row">
                            ${createFieldHtml('Name', 'crumb_name', crumb.name, 'e.g. Home')}
                            ${createFieldHtml('URL', 'crumb_url', crumb.url, 'e.g. https://example.com/')}
                        </div>
                    </div>`;
                });

                html = `
                <div class="av-gui-form" data-type="BreadcrumbList">
                    <div class="av-gui-repeater-list av-breadcrumb-list">
                        ${crumbsHtml}
                    </div>
                    <button type="button" class="av-btn av-btn-secondary av-btn-sm av-btn-add-crumb">+ Add Link</button>
                </div>`;
                break;

            case 'Organization':
                const sameAs = Array.isArray(data.sameAs) ? data.sameAs.join('\n') : '';
                const orgPhone = (data.contactPoint && data.contactPoint[0] && data.contactPoint[0].telephone) || '';

                html = `
                <div class="av-gui-form" data-type="Organization">
                    ${createFieldHtml('Organization Name', 'org_name', data.name || '')}
                    ${createFieldHtml('Contact Telephone', 'phone', orgPhone)}
                    ${createFieldHtml('Social Profile URLs (one per line)', 'same_as', sameAs, 'e.g. https://facebook.com/myorg', 'textarea')}
                </div>`;
                break;

            case 'WebSite':
                html = `
                <div class="av-gui-form" data-type="WebSite">
                    ${createFieldHtml('Website Name', 'site_name', data.name || '')}
                    ${createFieldHtml('Website URL', 'site_url', data.url || '')}
                    <div class="av-gui-row">
                        ${createFieldHtml('Date Created', 'date_created', data.dateCreated || '')}
                        ${createFieldHtml('Date Modified', 'date_modified', data.dateModified || '')}
                    </div>
                </div>`;
                break;

            case 'Review':
                const rating = (data.reviewRating && data.reviewRating.ratingValue) || '5';
                const reviewer = (data.author && data.author.name) || '';
                const item = (data.itemReviewed && data.itemReviewed.name) || '';

                html = `
                <div class="av-gui-form" data-type="Review">
                    <div class="av-gui-row">
                        ${createFieldHtml('Rating (1-5)', 'rating', rating, 'e.g. 5')}
                        ${createFieldHtml('Reviewer Name', 'reviewer', reviewer)}
                    </div>
                    ${createFieldHtml('Item Reviewed Name', 'item', item)}
                    ${createFieldHtml('Review Body / Content', 'body', data.reviewBody || '', '', 'textarea')}
                </div>`;
                break;

            case 'Event':
                const start = data.startDate || '';
                const end = data.endDate || '';
                const venue = (data.location && data.location.name) || '';
                const evtAddress = (data.location && data.location.address) || '';

                html = `
                <div class="av-gui-form" data-type="Event">
                    ${createFieldHtml('Event Name', 'evt_name', data.name || '')}
                    <div class="av-gui-row">
                        ${createFieldHtml('Start Date / Time', 'start_date', start, 'e.g. YYYY-MM-DDTHH:MM')}
                        ${createFieldHtml('End Date / Time', 'end_date', end, 'e.g. YYYY-MM-DDTHH:MM')}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('Venue Name', 'venue', venue)}
                        ${createFieldHtml('Venue Address', 'evt_address', evtAddress)}
                    </div>
                    ${createFieldHtml('Event Description', 'evt_desc', data.description || '', '', 'textarea')}
                </div>`;
                break;

            case 'VideoObject':
                html = `
                <div class="av-gui-form" data-type="VideoObject">
                    ${createFieldHtml('Video Title', 'vid_name', data.name || '')}
                    ${createFieldHtml('Video Description', 'vid_desc', data.description || '', '', 'textarea')}
                    ${createFieldHtml('Thumbnail Image URL', 'thumbnail', data.thumbnailUrl || '')}
                    ${createFieldHtml('Video Content URL', 'content_url', data.contentUrl || '')}
                    <div class="av-gui-row">
                        ${createFieldHtml('Video Embed URL', 'embed_url', data.embedUrl || '')}
                        ${createFieldHtml('Duration', 'duration', data.duration || 'PT5M')}
                    </div>
                </div>`;
                break;

            case 'Person':
                const personAlumni = (data.alumniOf && data.alumniOf.name) || '';
                const personCredentials = Array.isArray(data.hasCredential) ? data.hasCredential.join('\n') : '';
                const personKnowsAbout = Array.isArray(data.knowsAbout) ? data.knowsAbout.join('\n') : '';
                const experience = (data.workExperience && data.workExperience.experienceRequirements) || '';
                const responsibilities = (data.workExperience && data.workExperience.responsibilities) || '';

                html = `
                <div class="av-gui-form" data-type="Person">
                    <div class="av-gui-row">
                        ${createFieldHtml('Full Name', 'person_name', data.name || '')}
                        ${createFieldHtml('Job Title', 'job_title', data.jobTitle || '')}
                    </div>
                    <div class="av-gui-row">
                        ${createFieldHtml('Alumni Of (University)', 'alumni_of', personAlumni)}
                        ${createFieldHtml('Years of Experience', 'experience', experience, 'e.g. 20+ years')}
                    </div>
                    ${createFieldHtml('Responsibilities', 'responsibilities', responsibilities, 'e.g. Principal partner, lead consultant, chief diagnostician...', 'textarea')}
                    ${createFieldHtml('Credentials / Certifications (one per line)', 'credentials', personCredentials, 'e.g. Master of Science, Licensed Contractor, Board Certified...', 'textarea')}
                    ${createFieldHtml('Areas of Expertise (one per line)', 'knows_about', personKnowsAbout, 'e.g. Corporate Law, Restorative Surgery, or Energy Efficiency', 'textarea')}
                </div>`;
                break;
        }

        if (!html) {
            html = `
            <div class="av-gui-form" data-type="${escHtml(type)}" style="text-align:center; padding:30px 20px;">
                <div style="font-size:28px; margin-bottom:8px;">⚙️</div>
                <strong style="color:#1e293b;">Schema Type: ${escHtml(type)}</strong>
                <p style="font-size:12px; color:#64748b; margin:6px auto 14px; max-width:420px;">
                    This schema type uses the <strong>Code View</strong> editor for JSON-LD data inspection and editing.
                </p>
                <button type="button" class="aivision-btn aivision-btn-sm aivision-btn-secondary av-switch-to-code-btn" style="display:inline-flex; align-items:center; gap:6px;">💻 Open in Code View</button>
            </div>`;
        }

        $item.find('.av-schema-gui-container').html(html);
    }

    // Synchronize Form GUI Changes to Hidden JSON Textarea
    function syncGuiToJson($form) {
        const type = $form.data('type') || $form.closest('[data-type]').data('type') || $form.closest('[data-type]').attr('data-type');
        const $item = $form.closest('.av-schema-item, .av-schema-editor-card, .aivision-card');
        let $textarea = $item.find('textarea.av-code');
        if (!$textarea.length) {
            $textarea = $item.find('#av-schema-output');
        }
        
        let data = {};
        try {
            data = JSON.parse($textarea.val()) || {};
        } catch (e) {
            data = {};
        }
        
        data['@context'] = 'https://schema.org';
        data['@type'] = type;

        function val(name) {
            return $form.find(`.av-gui-input[data-name="${name}"]`).val() || '';
        }

        switch (type) {
            case 'FAQPage':
                const faqs = [];
                $form.find('.av-faq-item').each(function () {
                    const q = $(this).find('.av-gui-input[data-name="q"]').val() || '';
                    const a = $(this).find('.av-gui-input[data-name="a"]').val() || '';
                    if (q || a) {
                        faqs.push({
                            '@type': 'Question',
                            'name': q,
                            'acceptedAnswer': {
                                '@type': 'Answer',
                                'text': a
                            }
                        });
                    }
                });
                data['mainEntity'] = faqs;
                break;

            case 'Article':
            case 'BlogPosting':
                data['headline'] = val('headline');
                data['description'] = val('description');
                data['author'] = {
                    '@type': 'Person',
                    'name': val('author_name'),
                    'url': val('author_url')
                };
                data['publisher'] = {
                    '@type': 'Organization',
                    'name': val('publisher_name'),
                    'logo': data['publisher'] && data['publisher']['logo'] ? data['publisher']['logo'] : { '@type': 'ImageObject', 'url': '' }
                };
                data['image'] = val('image');
                break;

            case 'LocalBusiness':
                const localBizType = val('biz_type') || 'LocalBusiness';
                data['@type'] = localBizType;
                data['name'] = val('biz_name');
                data['url'] = val('biz_url');
                data['telephone'] = val('phone');
                data['email'] = val('email');
                data['address'] = {
                    '@type': 'PostalAddress',
                    'streetAddress': val('street'),
                    'addressLocality': val('city'),
                    'postalCode': val('postal_code'),
                    'addressCountry': val('country')
                };
                data['priceRange'] = val('price');
                data['image'] = val('image');
 
                const specVal = val('medical_specialty');
                if (specVal) {
                    data['medicalSpecialty'] = specVal;
                } else {
                    delete data['medicalSpecialty'];
                }
 
                const catalogNameInput = val('catalog_name');
                const catalogItemsList = [];
                
                $form.find('.av-catalog-item').each(function () {
                    const itemName = $(this).find('.av-gui-input[data-name="catalog_item_name"]').val() || '';
                    const itemDesc = $(this).find('.av-gui-input[data-name="catalog_item_desc"]').val() || '';
                    const itemType = $(this).find('input[data-name="catalog_item_type"]').val() || (['MedicalBusiness', 'Dentist', 'Hospital', 'MedicalClinic'].includes(localBizType) ? 'MedicalProcedure' : 'Service');
                    
                    if (itemName || itemDesc) {
                        catalogItemsList.push({
                            '@type': itemType,
                            'name': itemName,
                            'description': itemDesc
                        });
                    }
                });

                if (catalogNameInput || catalogItemsList.length > 0) {
                    data['hasOfferCatalog'] = {
                        '@type': 'OfferCatalog',
                        'name': catalogNameInput || 'Services',
                        'itemListElement': catalogItemsList
                    };
                } else {
                    delete data['hasOfferCatalog'];
                }
                break;

            case 'HowTo':
                data['name'] = val('how_name');
                data['description'] = val('how_desc');
                data['totalTime'] = val('total_time');
                const steps = [];
                $form.find('.av-howto-step').each(function (idx) {
                    const name = $(this).find('.av-gui-input[data-name="step_name"]').val() || '';
                    const text = $(this).find('.av-gui-input[data-name="step_text"]').val() || '';
                    if (name || text) {
                        steps.push({
                            '@type': 'HowToStep',
                            'position': idx + 1,
                            'name': name,
                            'text': text
                        });
                    }
                });
                data['step'] = steps;
                break;

            case 'Product':
                data['name'] = val('prod_name');
                data['description'] = val('prod_desc');
                data['image'] = val('image');
                data['brand'] = { '@type': 'Brand', 'name': val('brand') };
                data['offers'] = {
                    '@type': 'Offer',
                    'price': val('price'),
                    'priceCurrency': val('currency'),
                    'availability': 'https://schema.org/InStock',
                    'url': data['offers'] && data['offers']['url'] ? data['offers']['url'] : ''
                };
                break;

            case 'Service':
                const services = [];
                const providerName = val('provider');
                const areaServed = val('area');
                
                $form.find('.av-service-item').each(function () {
                    const name = $(this).find('.av-gui-input[data-name="svc_name"]').val() || '';
                    const desc = $(this).find('.av-gui-input[data-name="svc_desc"]').val() || '';
                    const svcType = $(this).find('.av-gui-input[data-name="svc_type"]').val() || '';
                    
                    if (name || desc) {
                        const svcObj = {
                            '@context': 'https://schema.org',
                            '@type': 'Service',
                            'name': name,
                            'description': desc,
                            'url': data['url'] || ''
                        };
                        if (providerName) {
                            svcObj['provider'] = {
                                '@type': 'Organization',
                                'name': providerName,
                                'url': ''
                            };
                        }
                        if (areaServed) {
                            svcObj['areaServed'] = areaServed;
                        }
                        if (svcType) {
                            svcObj['serviceType'] = svcType;
                        }
                        services.push(svcObj);
                    }
                });

                if (services.length === 1) {
                    data = services[0];
                } else if (services.length > 1) {
                    data = services;
                } else {
                    data = {
                        '@context': 'https://schema.org',
                        '@type': 'Service',
                        'name': '',
                        'description': '',
                        'url': data['url'] || ''
                    };
                }
                break;

            case 'BreadcrumbList':
                const crumbs = [];
                $form.find('.av-breadcrumb-item').each(function (idx) {
                    const name = $(this).find('.av-gui-input[data-name="crumb_name"]').val() || '';
                    const url = $(this).find('.av-gui-input[data-name="crumb_url"]').val() || '';
                    if (name || url) {
                        crumbs.push({
                            '@type': 'ListItem',
                            'position': idx + 1,
                            'name': name,
                            'item': url
                        });
                    }
                });
                data['itemListElement'] = crumbs;
                break;

            case 'Organization':
                data['name'] = val('org_name');
                data['contactPoint'] = [{
                    '@type': 'ContactPoint',
                    'telephone': val('phone'),
                    'contactType': 'customer service'
                }];
                const sameAsText = val('same_as');
                data['sameAs'] = sameAsText ? sameAsText.split('\n').map(s => s.trim()).filter(s => s) : [];
                break;

            case 'WebSite':
                data['name'] = val('site_name');
                data['url'] = val('site_url');
                data['dateCreated'] = val('date_created');
                data['dateModified'] = val('date_modified');
                break;

            case 'Review':
                data['reviewRating'] = {
                    '@type': 'Rating',
                    'ratingValue': val('rating'),
                    'bestRating': '5'
                };
                data['author'] = { '@type': 'Person', 'name': val('reviewer') };
                data['itemReviewed'] = { '@type': 'Thing', 'name': val('item') };
                data['reviewBody'] = val('body');
                break;

            case 'Event':
                data['name'] = val('evt_name');
                data['startDate'] = val('start_date');
                data['endDate'] = val('end_date');
                data['location'] = {
                    '@type': 'Place',
                    'name': val('venue'),
                    'address': val('evt_address')
                };
                data['description'] = val('evt_desc');
                break;

            case 'VideoObject':
                data['name'] = val('vid_name');
                data['description'] = val('vid_desc');
                data['thumbnailUrl'] = val('thumbnail');
                data['contentUrl'] = val('content_url');
                data['embedUrl'] = val('embed_url');
                data['duration'] = val('duration');
                break;

            case 'Person':
                data['name'] = val('person_name');
                data['jobTitle'] = val('job_title');
                data['alumniOf'] = {
                    '@type': 'CollegeOrUniversity',
                    'name': val('alumni_of')
                };
                const credsText = val('credentials');
                data['hasCredential'] = credsText ? credsText.split('\n').map(s => s.trim()).filter(s => s) : [];
                const knowsText = val('knows_about');
                data['knowsAbout'] = knowsText ? knowsText.split('\n').map(s => s.trim()).filter(s => s) : [];
                data['workExperience'] = {
                    '@type': 'Occupation',
                    'experienceRequirements': val('experience'),
                    'responsibilities': val('responsibilities')
                };
                break;
        }

        $textarea.val(JSON.stringify(data, null, 4));
        if ($item.is('#av-gen-schema-card, .av-schema-editor-card')) {
            showValidation(true, []);
            $('#av-save-to-post-schema').show();
        }
    }

    // Dynamic FAQ list actions
    $(document).on('click', '.av-btn-add-faq', function () {
        const $form = $(this).closest('.av-gui-form');
        const $list = $form.find('.av-faq-list');
        const nextIdx = $list.find('.av-faq-item').length;

        const faqHtml = `
        <div class="av-gui-repeater-item av-faq-item" data-index="${nextIdx}">
            <div class="av-gui-repeater-item-header">
                <span>Question #${nextIdx + 1}</span>
                <button type="button" class="av-gui-btn-remove av-btn-remove-faq">&times; Remove</button>
            </div>
            ${createFieldHtml('Question', 'q', '', 'e.g. What is your return policy?')}
            ${createFieldHtml('Answer', 'a', '', 'e.g. We accept returns within 30 days.', 'textarea')}
        </div>`;
        $list.append(faqHtml);
        syncGuiToJson($form);
    });

    $(document).on('click', '.av-btn-remove-faq', function () {
        const $form = $(this).closest('.av-gui-form');
        $(this).closest('.av-faq-item').remove();
        $form.find('.av-faq-item').each(function (idx) {
            $(this).attr('data-index', idx);
            $(this).find('.av-gui-repeater-item-header span').text(`Question #${idx + 1}`);
        });
        syncGuiToJson($form);
    });

    // Dynamic HowTo step actions
    $(document).on('click', '.av-btn-add-step', function () {
        const $form = $(this).closest('.av-gui-form');
        const $list = $form.find('.av-howto-list');
        const nextIdx = $list.find('.av-howto-step').length;

        const stepHtml = `
        <div class="av-gui-repeater-item av-howto-step" data-index="${nextIdx}">
            <div class="av-gui-repeater-item-header">
                <span>Step #${nextIdx + 1}</span>
                <button type="button" class="av-gui-btn-remove av-btn-remove-step">&times; Remove</button>
            </div>
            ${createFieldHtml('Step Name', 'step_name', '', 'e.g. Prepare the materials')}
            ${createFieldHtml('Step Text / Description', 'step_text', '', 'e.g. Lay out all items on a clean surface.', 'textarea')}
        </div>`;
        $list.append(stepHtml);
        syncGuiToJson($form);
    });

    $(document).on('click', '.av-btn-remove-step', function () {
        const $form = $(this).closest('.av-gui-form');
        $(this).closest('.av-howto-step').remove();
        $form.find('.av-howto-step').each(function (idx) {
            $(this).attr('data-index', idx);
            $(this).find('.av-gui-repeater-item-header span').text(`Step #${idx + 1}`);
        });
        syncGuiToJson($form);
    });

    // Dynamic Breadcrumb actions
    $(document).on('click', '.av-btn-add-crumb', function () {
        const $form = $(this).closest('.av-gui-form');
        const $list = $form.find('.av-breadcrumb-list');
        const nextIdx = $list.find('.av-breadcrumb-item').length;

        const crumbHtml = `
        <div class="av-gui-repeater-item av-breadcrumb-item" data-index="${nextIdx}">
            <div class="av-gui-repeater-item-header">
                <span>Breadcrumb #${nextIdx + 1}</span>
                <button type="button" class="av-gui-btn-remove av-btn-remove-crumb">&times; Remove</button>
            </div>
            <div class="av-gui-row">
                ${createFieldHtml('Name', 'crumb_name', '', 'e.g. Home')}
                ${createFieldHtml('URL', 'crumb_url', '', 'e.g. https://example.com/')}
            </div>
        </div>`;
        $list.append(crumbHtml);
        syncGuiToJson($form);
    });

    $(document).on('click', '.av-btn-remove-crumb', function () {
        const $form = $(this).closest('.av-gui-form');
        $(this).closest('.av-breadcrumb-item').remove();
        $form.find('.av-breadcrumb-item').each(function (idx) {
            $(this).attr('data-index', idx);
            $(this).find('.av-gui-repeater-item-header span').text(`Breadcrumb #${idx + 1}`);
        });
        syncGuiToJson($form);
    });

    // Dynamic Service list actions
    $(document).on('click', '.av-btn-add-service', function () {
        const $form = $(this).closest('.av-gui-form');
        const $list = $form.find('.av-service-list');
        const nextIdx = $list.find('.av-service-item').length;

        const serviceHtml = `
        <div class="av-gui-repeater-item av-service-item" data-index="${nextIdx}">
            <div class="av-gui-repeater-item-header">
                <span>Service #${nextIdx + 1}</span>
                <button type="button" class="av-gui-btn-remove av-btn-remove-service">&times; Remove</button>
            </div>
            ${createFieldHtml('Service Name', 'svc_name', '', 'e.g. Emergency Roof Repair or Dental Cleaning')}
            ${createFieldHtml('Service Description', 'svc_desc', '', 'Describe the service...', 'textarea')}
            ${createFieldHtml('Service Type', 'svc_type', '', 'e.g. RoofingContractor, LegalService, or MedicalProcedure')}
        </div>`;
        $list.append(serviceHtml);
        syncGuiToJson($form);
    });

    $(document).on('click', '.av-btn-remove-service', function () {
        const $form = $(this).closest('.av-gui-form');
        $(this).closest('.av-service-item').remove();
        $form.find('.av-service-item').each(function (idx) {
            $(this).attr('data-index', idx);
            $(this).find('.av-gui-repeater-item-header span').text(`Service #${idx + 1}`);
        });
        syncGuiToJson($form);
    });

    // Dynamic Catalog list actions
    $(document).on('click', '.av-btn-add-catalog-item', function () {
        const $form = $(this).closest('.av-gui-form');
        const bizType = $form.find('.av-gui-input[data-name="biz_type"]').val() || '';
        const $list = $form.find('.av-catalog-list');
        const nextIdx = $list.find('.av-catalog-item').length;
        const itemType = (['MedicalBusiness', 'Dentist', 'Hospital', 'MedicalClinic'].includes(bizType)) ? 'MedicalProcedure' : 'Service';

        const itemHtml = `
        <div class="av-gui-repeater-item av-catalog-item" data-index="${nextIdx}">
            <div class="av-gui-repeater-item-header">
                <span>Service/Procedure #${nextIdx + 1}</span>
                <button type="button" class="av-gui-btn-remove av-btn-remove-catalog-item">&times; Remove</button>
            </div>
            <input type="hidden" class="av-gui-input" data-name="catalog_item_type" value="${itemType}">
            ${createFieldHtml('Item Name', 'catalog_item_name', '', 'e.g. Calculus Cleaning')}
            ${createFieldHtml('Item Description', 'catalog_item_desc', '', 'Describe the service...', 'textarea')}
        </div>`;
        $list.append(itemHtml);
        syncGuiToJson($form);
    });

    $(document).on('click', '.av-btn-remove-catalog-item', function () {
        const $form = $(this).closest('.av-gui-form');
        $(this).closest('.av-catalog-item').remove();
        $form.find('.av-catalog-item').each(function (idx) {
            $(this).attr('data-index', idx);
            $(this).find('.av-gui-repeater-item-header span').text(`Service/Procedure #${idx + 1}`);
        });
        syncGuiToJson($form);
    });

    // Handle form input changes
    $(document).on('input change', '.av-gui-form .av-gui-input', function () {
        const $form = $(this).closest('.av-gui-form');
        syncGuiToJson($form);
    });

    // Initialize existing schema GUIs on load
    $(function () {
        $('.av-schema-item').each(function () {
            initSchemaGui($(this));
        });
    });

    // Schema — delete
    $(document).on('click', '.av-schema-delete', function () {
        if (!confirm('Remove this schema?')) return;
        const $item  = $(this).closest('.av-schema-item');
        const postId = $(this).data('post-id');
        const index  = $(this).data('index');
        request('aivision_delete_schema', { post_id: postId, index }, function (res) {
            if (!res.success) return notify('Failed to remove.', 'error');
            $item.slideUp(200, () => $item.remove());
            notify('Schema removed.');
        });
    });

    // ── Robots preview ────────────────────────────────────────────────────────
    function loadRobotsPreview() {
        request('aivision_robots_preview', {}, function (res) {
            if (res.success) $('#av-robots-preview').text(res.data.content);
        });
    }
    if ($('#av-robots-preview').length) loadRobotsPreview();

    $(document).on('click', '#av-refresh-robots', function () {
        $(this).text('Refreshing…').prop('disabled', true);
        const $btn = $(this);
        request('aivision_robots_preview', {}, function (res) {
            $btn.text('Refresh').prop('disabled', false);
            if (res.success) $('#av-robots-preview').text(res.data.content);
        });
    });

    // ── Save bot settings ─────────────────────────────────────────────────────
    $(document).on('click', '#av-save-bots', function () {
        const bots = [];
        $('input[name="allowed_bots[]"]:checked').each(function () { bots.push($(this).val()); });
        request('aivision_save_settings', { allowed_bots: bots, ai_crawlers_enabled: 1, is_bot_settings: 1 }, function (res) {
            if (res.success) {
                notify('Bot settings saved!');
                // Update badges
                $('input[name="allowed_bots[]"]').each(function () {
                    const $badge = $(this).closest('.aivision-bot-row').find('.aivision-badge');
                    if ($(this).is(':checked')) {
                        $badge.removeClass('aivision-badge-red').addClass('aivision-badge-green').text('Allowed');
                    } else {
                        $badge.removeClass('aivision-badge-green').addClass('aivision-badge-red').text('Blocked');
                    }
                });
                loadRobotsPreview();
            } else {
                notify('Save failed.', 'error');
            }
        });
    });

    // Update badge label live when toggle changes
    $(document).on('change', 'input[name="allowed_bots[]"]', function () {
        const $badge = $(this).closest('.aivision-bot-row').find('.aivision-badge');
        if ($(this).is(':checked')) {
            $badge.removeClass('aivision-badge-red').addClass('aivision-badge-green').text('Allowed');
        } else {
            $badge.removeClass('aivision-badge-green').addClass('aivision-badge-red').text('Blocked');
        }
    });

    // ── Settings form ─────────────────────────────────────────────────────────
    $(document).on('submit', '#av-settings-form', function (e) {
        e.preventDefault();
        const data = {};
        $(this).serializeArray().forEach(f => { data[f.name] = f.value; });
        if ($('input[name=ai_crawlers_enabled]').is(':checked')) data.ai_crawlers_enabled = '1';
        if ($('input[name=remove_default_generator]').is(':checked')) data.remove_default_generator = '1';
        request('aivision_save_settings', data, function (res) {
            notify(res.success ? 'Settings saved!' : 'Error saving.', res.success ? 'success' : 'error');
        });
    });

    // ── OG image media picker ─────────────────────────────────────────────────
    $(document).on('click', '#av-og-image-picker', function (e) {
        e.preventDefault();
        if (!window.wp || !wp.media) return notify('Media library not available.', 'error');
        const frame = wp.media({ title: 'Select OG Image', button: { text: 'Use this image' }, multiple: false });
        frame.on('select', function () {
            const att = frame.state().get('selection').first().toJSON();
            $('#av-og-image').val(att.url);
            let $prev = $('.av-og-preview');
            if (!$prev.length) $prev = $('<img class="av-og-preview" alt="OG Preview">').insertAfter('#av-og-image');
            $prev.attr('src', att.url);
        });
        frame.open();
    });

    // Sitemap generation trigger
    $(document).on('click', '#av-generate-sitemap-btn', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const originalText = $btn.text();
        $btn.text('Generating…').prop('disabled', true);
        const $status = $('#av-sitemap-status');

        request('aivision_generate_sitemap', {}, function (res) {
            $btn.text(originalText).prop('disabled', false);
            if (res.success) {
                notify(res.data.message);
                $status.removeClass('aivision-validation-err').addClass('aivision-validation-ok')
                    .html(`✅ <strong>Sitemap Updated:</strong> ${res.data.message} <br>URL: <a href="${res.data.url}" target="_blank">${res.data.url}</a>`)
                    .show();
                $('#av-sitemap-view-link').attr('href', res.data.url);
            } else {
                notify('Sitemap generation failed.', 'error');
                $status.removeClass('aivision-validation-ok').addClass('aivision-validation-err')
                    .text('❌ Error generating sitemap: ' + (res.data || 'Unknown error'))
                    .show();
            }
        });
    });

    // LLMs.txt generation trigger
    $(document).on('click', '#av-generate-llmstxt-btn', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const originalText = $btn.text();
        $btn.text('Generating…').prop('disabled', true);
        const $status = $('#av-llmstxt-status');

        request('aivision_generate_llmstxt', {}, function (res) {
            $btn.text(originalText).prop('disabled', false);
            if (res.success) {
                notify(res.data.message);
                $status.removeClass('aivision-validation-err').addClass('aivision-validation-ok')
                    .html(`✅ <strong>LLMs.txt Updated:</strong> ${res.data.message} <br>URL: <a href="${res.data.url}" target="_blank">${res.data.url}</a>`)
                    .show();
                $('#av-llmstxt-view-link').attr('href', res.data.url);
            } else {
                notify('LLMs.txt generation failed.', 'error');
                $status.removeClass('aivision-validation-ok').addClass('aivision-validation-err')
                    .text('❌ Error generating LLMs.txt: ' + (res.data || 'Unknown error'))
                    .show();
            }
        });
    });

    // LLMs-Full.txt generation trigger
    $(document).on('click', '#av-generate-llmstxt-full-btn', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const originalText = $btn.text();
        $btn.text('Generating Full Feed…').prop('disabled', true);
        const $status = $('#av-llmstxt-status');

        request('aivision_generate_llmstxt_full', {}, function (res) {
            $btn.text(originalText).prop('disabled', false);
            if (res.success) {
                notify(res.data.message);
                $status.removeClass('aivision-validation-err').addClass('aivision-validation-ok')
                    .html(`✅ <strong>LLMs-Full.txt Updated:</strong> ${res.data.message} <br>URL: <a href="${res.data.url}" target="_blank">${res.data.url}</a>`)
                    .show();
                $('#av-llmstxt-full-view-link').attr('href', res.data.url);
            } else {
                notify('LLMs-Full.txt generation failed.', 'error');
                $status.removeClass('aivision-validation-ok').addClass('aivision-validation-err')
                    .text('❌ Error generating LLMs-Full.txt: ' + (res.data || 'Unknown error'))
                    .show();
            }
        });
    });

    // Auto-Optimize robots.txt trigger
    $(document).on('click', '#av-auto-optimize-robots-btn', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const originalText = $btn.text();
        $btn.text('Optimizing…').prop('disabled', true);

        request('aivision_auto_optimize_robots', {}, function (res) {
            $btn.text(originalText).prop('disabled', false);
            if (res.success) {
                notify(res.data.message);
                if (res.data.preview) {
                    $('#av-robots-preview').text(res.data.preview);
                }
                if (res.data.allowed_bots) {
                    $('input[name="allowed_bots[]"]').each(function () {
                        const bot = $(this).val();
                        const isAllowed = res.data.allowed_bots.includes(bot);
                        $(this).prop('checked', isAllowed);
                        const $badge = $(this).closest('.aivision-bot-row').find('.aivision-badge');
                        if (isAllowed) {
                            $badge.removeClass('aivision-badge-red').addClass('aivision-badge-green').text('Allowed');
                        } else {
                            $badge.removeClass('aivision-badge-green').addClass('aivision-badge-red').text('Blocked');
                        }
                    });
                }
            } else {
                notify('Auto-optimization failed: ' + (res.data || 'Unknown error'), 'error');
            }
        });
    });

    // ── Dashboard Content Optimization Filtering ──────────────────────────────
    let dashboardSearchTimer = null;

    function reloadDashboardContent() {
        const statusVal   = $('#av-filter-status').val() || 'all';
        const postTypeVal = $('#av-filter-post-type').val() || 'all';
        const sortVal     = $('#av-filter-sort').val() || 'latest';
        const searchVal   = $('#av-filter-search').val() || '';

        // Update active quick pill
        $('#av-content-quick-pills .av-pill-btn').removeClass('active');
        const $matchingPill = $(`#av-content-quick-pills .av-pill-btn[data-status="${statusVal}"]`);
        if ($matchingPill.length) {
            $matchingPill.addClass('active');
        }

        // Toggle reset button
        if (statusVal !== 'all' || postTypeVal !== 'all' || sortVal !== 'latest' || searchVal.trim() !== '') {
            $('#av-filter-reset').show();
        } else {
            $('#av-filter-reset').hide();
        }

        // Show loading state
        $('#av-dashboard-table-loading').css('display', 'flex');

        request('aivision_filter_dashboard_content', {
            status_filter: statusVal,
            post_type: postTypeVal,
            sort_by: sortVal,
            search: searchVal
        }, function (res) {
            $('#av-dashboard-table-loading').hide();

            if (res && res.success && res.data) {
                const items = res.data.items || [];
                const stats = res.data.stats || {};
                const $tbody = $('#av-dashboard-content-table tbody');

                // Update quick pill stat numbers
                if (stats.total !== undefined)         $('#av-stat-all').text(stats.total);
                if (stats.low_score !== undefined)     $('#av-stat-low').text(stats.low_score);
                if (stats.not_optimized !== undefined) $('#av-stat-unopt').text(stats.not_optimized);
                if (stats.high_score !== undefined)    $('#av-stat-high').text(stats.high_score);
                if (stats.no_schema !== undefined)     $('#av-stat-schema').text(stats.no_schema);

                if (items.length === 0) {
                    $tbody.html(`
                        <tr class="av-empty-row">
                            <td colspan="7" style="text-align:center; padding:36px 16px; color:var(--av-gray-500);">
                                <div style="font-size:26px; margin-bottom:8px;">🔍</div>
                                <strong style="font-size:14px; color:var(--av-gray-700);">No content found matching current filters.</strong>
                                <p style="margin:6px 0 12px; font-size:12px;">Try adjusting your filters or searching for another keyword.</p>
                                <button type="button" class="aivision-btn aivision-btn-secondary aivision-btn-sm" id="av-empty-reset-btn">Reset All Filters</button>
                            </td>
                        </tr>
                    `);
                    $('#av-filter-count-info').text('0 items found');
                } else {
                    let rowsHtml = '';
                    items.forEach(function (item) {
                        rowsHtml += renderDashboardRow(item);
                    });
                    $tbody.html(rowsHtml);

                    const totalStr = stats.total !== undefined ? stats.total : items.length;
                    $('#av-filter-count-info').text(`Showing ${items.length} of ${totalStr} total items`);
                }
            }
        });
    }

    function renderDashboardRow(item) {
        const postTypeBadge = `<span class="aivision-badge aivision-badge-gray" style="font-size:10px; text-transform:uppercase;">${escHtml(item.post_type)}</span>`;
        const focusKw = item.focus_kw ? `<span style="font-size:11px; color:#4f46e5; background:#eef2ff; padding:1px 6px; border-radius:4px;" title="Focus Keyword">🎯 ${escHtml(item.focus_kw)}</span>` : '';
        const schemaBadge = item.schemas > 0
            ? `<span class="aivision-badge aivision-badge-green">${item.schemas} schema${item.schemas > 1 ? 's' : ''}</span>`
            : `<span class="aivision-badge aivision-badge-gray">None</span>`;

        return `<tr data-post-id="${item.id}" data-post-type="${escHtml(item.post_type)}">
            <td>
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    ${postTypeBadge}
                    <strong>${escHtml(item.title)}</strong>
                    ${focusKw}
                </div>
                <div class="aivision-meta-url">
                    <a href="${escUrl(item.url)}" target="_blank">${escHtml(item.url)}</a>
                    <span style="color:#94a3b8; margin-left:8px;">📅 ${escHtml(item.date_str)}</span>
                </div>
            </td>
            <td><span class="aivision-score-badge" style="background:${escHtml(item.seo_color)}">${item.seo_score}%</span></td>
            <td><span class="aivision-score-badge" style="background:${escHtml(item.aeo_color)}">${item.aeo_score}%</span></td>
            <td><span class="aivision-score-badge" style="background:${escHtml(item.geo_color)}">${item.geo_score}%</span></td>
            <td><span class="aivision-score-badge" style="background:${escHtml(item.avg_color)}; font-weight:700;">${item.avg_score}%</span></td>
            <td>${schemaBadge}</td>
            <td><a href="${escUrl(item.edit_url)}" class="aivision-btn aivision-btn-sm aivision-btn-primary">Edit &amp; Optimize</a></td>
        </tr>`;
    }

    function escHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#039;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function escUrl(str) {
        return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#039;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // Filter control changes
    $(document).on('change', '#av-filter-status, #av-filter-post-type, #av-filter-sort', function () {
        reloadDashboardContent();
    });

    // Search input with debounce
    $(document).on('input', '#av-filter-search', function () {
        clearTimeout(dashboardSearchTimer);
        dashboardSearchTimer = setTimeout(function () {
            reloadDashboardContent();
        }, 300);
    });

    // Quick pill clicks
    $(document).on('click', '#av-content-quick-pills .av-pill-btn', function (e) {
        e.preventDefault();
        const status = $(this).data('status') || 'all';
        $('#av-filter-status').val(status);
        reloadDashboardContent();
    });

    // Reset filters
    $(document).on('click', '#av-filter-reset, #av-empty-reset-btn', function (e) {
        e.preventDefault();
        $('#av-filter-status').val('all');
        $('#av-filter-post-type').val('all');
        $('#av-filter-sort').val('latest');
        $('#av-filter-search').val('');
        reloadDashboardContent();
    });

    // ── AIVisibility SEO Cloud Integration Handlers ──────────────────────────
    $(document).on('click', '#av-test-aivisibility-btn, #av-test-brandos-btn', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const apiUrl = $('#av-aivisibility-api-url').val() || $('#av-brandos-api-url').val();
        const apiKey = $('#av-aivisibility-api-key').val() || $('#av-brandos-api-key').val();
        const $status = $('#av-aivisibility-status, #av-brandos-status');

        if (!apiKey) {
            $status.css({ display: 'block', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' })
                   .html('❌ Please enter your AIVisibility SEO API Key.');
            return;
        }

        $btn.text('Connecting…').prop('disabled', true);
        $status.css({ display: 'block', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' })
               .html('🔄 Testing connection with AIVisibility SEO Cloud…');

        request('aivision_test_aivisibility', { api_url: apiUrl, api_key: apiKey }, function (res) {
            $btn.text('⚡ Test & Connect').prop('disabled', false);
            if (res.success) {
                $status.css({ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' })
                       .html('✔ <strong>Connected successfully!</strong> Linked with business: ' + escHtml(res.data.business || 'AIVisibility SEO Business'));
                notify('Connected to AIVisibility SEO successfully!');
                setTimeout(() => location.reload(), 1500);
            } else {
                $status.css({ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' })
                       .html('❌ <strong>Connection failed:</strong> ' + escHtml(res.data || 'Please verify your API key and URL.'));
            }
        });
    });

    $(document).on('click', '#av-disconnect-aivisibility-btn, #av-disconnect-brandos-btn', function (e) {
        e.preventDefault();
        if (!confirm('Are you sure you want to disconnect from AIVisibility SEO and revert to Standalone Mode?')) return;
        const $btn = $(this).text('Disconnecting…').prop('disabled', true);
        request('aivision_save_aivisibility', { disconnect: 1 }, function (res) {
            notify('Reverted to Standalone Mode.');
            setTimeout(() => location.reload(), 1000);
        });
    });

    $(document).on('click', '#av-sync-aivisibility-btn, #av-sync-brandos-btn', function (e) {
        e.preventDefault();
        const $btn = $(this).text('Syncing…').prop('disabled', true);
        request('aivision_sync_aivisibility', {}, function (res) {
            $btn.text('🔄 Sync Telemetry').prop('disabled', false);
            if (res.success) {
                notify('Telemetry synchronized with AIVisibility SEO!');
                $('#av-aivisibility-status, #av-brandos-status').css({ display: 'block', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' })
                                       .html('✔ ' + escHtml(res.data.message));
            } else {
                notify(res.data || 'Sync failed', 'error');
            }
        });
    });

    // ── Check for Updates ───────────────────────────────────────────────────
    $(document).on('click', '#av-check-updates-btn', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const origText = $btn.text();
        $btn.text('Checking…').prop('disabled', true);

        request('aivision_check_update', {}, function (res) {
            $btn.text(origText).prop('disabled', false);
            if (res && res.success) {
                if (res.data.has_update) {
                    if (confirm(res.data.message + '\n\nWould you like to install the update now?')) {
                        window.location.href = res.data.update_url;
                    } else {
                        notify(res.data.message);
                    }
                } else {
                    notify(res.data.message || 'You have the latest version!');
                }
            } else {
                const errMsg = (res && res.data) ? res.data : 'Failed to connect to update server.';
                notify(errMsg, 'error');
            }
        });
    });

})(jQuery);

