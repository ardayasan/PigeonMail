from __future__ import annotations


def c(case_id: str, lang: str, expected: str, subject: str, body: str, tags: list[str]) -> dict:
    return {
        "id": case_id,
        "lang": lang,
        "expected": expected,
        "subject": subject,
        "body": body,
        "tags": tags,
    }


CASES_V2 = [
    c("EN01", "en", "Work", "Tiny follow-up", "Sorry for sending this late. Can you review the customer notes, close the ticket, and confirm whether the milestone moves after tomorrow's meeting?", ["mixed_tone", "customer"]),
    c("EN02", "en", "Work", "Dinner and draft", "Dinner was fun. Separately, I still need your comments on the draft proposal, the budget assumptions, and the delivery timeline before the client call.", ["personal_plus_work", "proposal"]),
    c("EN03", "en", "Work", "Need a quick yes", "Can you approve the deployment window and leave feedback on the pull request? The backend team says the integration tests passed after the last fix.", ["engineering", "approval"]),
    c("EN04", "en", "Work", "Travel note", "I booked the train, but please upload the expense summary and trip report before finance closes reimbursement for the conference.", ["travel", "expense"]),
    c("EN05", "en", "Work", "One question", "Before I send the notes, do we still want the roadmap slide and the incident summary in tomorrow's office review?", ["office", "review"]),

    c("EN06", "en", "Personal", "Sunday update", "Are you still free on Sunday? I found the dinner receipt and your jacket, and I can bring both when we meet. No rush at all.", ["receipt", "friends"]),
    c("EN07", "en", "Personal", "Train tickets", "I booked our train tickets for next month. We can sort out the money later, but mostly I just wanted to say I miss you.", ["ticket_word", "romantic"]),
    c("EN08", "en", "Personal", "Quick favor", "Can you water the plants while I am away and leave the spare keys under the mat for my sister?", ["home", "family"]),
    c("EN09", "en", "Personal", "Small refund", "The cafe refunded the extra charge from brunch, so your share is even smaller now. Let us settle it next time we see each other.", ["refund_word", "friends"]),
    c("EN10", "en", "Personal", "How is your dad?", "No pressure to reply. I just wanted to ask how your dad is doing and whether you need anything this week.", ["care", "family"]),

    c("EN11", "en", "Spam", "Security verification required", "We detected unusual activity on your profile. To avoid interruption, verify your information today through the secure portal and restore access immediately.", ["phishing", "verification"]),
    c("EN12", "en", "Spam", "Package problem", "Your package delivery failed. Confirm your address and pay the redelivery fee using the secure link below.", ["delivery_scam", "small_fee"]),
    c("EN13", "en", "Spam", "Urgent private request", "I am stuck abroad and need a wire transfer quickly. Please reply before speaking to anyone else because this is confidential.", ["impersonation", "wire_transfer"]),
    c("EN14", "en", "Spam", "Document shared", "A confidential file was shared with you. Open the attachment and enable access so the encrypted document can be viewed.", ["attachment_bait", "malicious"]),
    c("EN15", "en", "Spam", "Tax refund release", "Your tax refund is pending, but we must validate your card details and identity before funds can be released.", ["refund", "fraud"]),

    c("EN16", "en", "Finance", "Billing summary", "Your annual plan renewed successfully. The receipt, billing date, and transaction ID are available in your account.", ["subscription", "receipt"]),
    c("EN17", "en", "Finance", "Invoice enclosed", "Please find the invoice attached. Payment is due within ten days and the bank reference appears at the bottom.", ["invoice", "payment"]),
    c("EN18", "en", "Finance", "Refund complete", "The refund for your canceled booking has been issued to the original credit card and should appear within a few business days.", ["refund", "card"]),
    c("EN19", "en", "Finance", "Statement ready", "Your monthly statement includes the annual fee and all posted transactions for the last cycle.", ["statement", "monthly"]),
    c("EN20", "en", "Finance", "Chargeback result", "The chargeback investigation was resolved in your favor and the provisional credit is now permanent.", ["chargeback", "credit"]),

    c("EN21", "en", "Promotions", "Member perks unlocked", "You now have free shipping, bonus shopping credits, and an extra 20% off selected items this week only.", ["discount", "member_benefits"]),
    c("EN22", "en", "Promotions", "Back in stock", "Items from your wishlist are back in stock, and several are now on sale for a limited time.", ["wishlist", "sale"]),
    c("EN23", "en", "Promotions", "Travel deal", "Book now to unlock discounted fares, hotel credits, and bonus points on selected routes.", ["travel_offer", "marketing"]),
    c("EN24", "en", "Promotions", "Exclusive offer", "Use the code inside and shop now before this exclusive offer expires at midnight.", ["promo_code", "urgency"]),
    c("EN25", "en", "Promotions", "Course launch", "Enrollment is open and early buyers receive a special offer plus bonus materials if they register today.", ["education_marketing", "offer"]),

    c("EN26", "en", "Social", "New activity waiting", "Someone mentioned you in a discussion, two people reacted to your recent post, and you have a connection request.", ["mentions", "network"]),
    c("EN27", "en", "Social", "Club update", "The book club has new messages, a poll is open, and one member replied directly to your comment.", ["community", "messages"]),
    c("EN28", "en", "Social", "New followers", "Two accounts followed you this morning and another user commented on your latest photo.", ["followers", "comment"]),
    c("EN29", "en", "Social", "Invitation inside", "You were invited to join a private group and someone tagged you in a conversation from yesterday.", ["invite", "tagged"]),
    c("EN30", "en", "Social", "Profile activity", "There is new profile activity since yesterday, including follows, comments, and mentions.", ["platform", "notification"]),

    c("TR01", "tr", "Work", "Kucuk bir hatirlatma", "Rahatsiz ediyorum ama yarinki toplantidan once musteri notlarini guncelleyip acik ticket icin yorum birakabilir misin? Milestone kayabilir.", ["mixed_tone", "customer"]),
    c("TR02", "tr", "Work", "Aksamdan once", "Aksam gorusuruz. Bu arada pull request uzerindeki yorumlarini ve deploy plani icin son onayi bugun iletebilir misin?", ["engineering", "approval"]),
    c("TR03", "tr", "Work", "Seyahat notu", "Tren biletini aldim ama konferans giderleri kapanmadan once expense ozetiyle seyahat raporunu yuklemen gerekiyor.", ["travel", "expense"]),
    c("TR04", "tr", "Work", "Taslak hakkinda", "Taslakta butce varsayimlari, teslim tarihi ve musteri sunumu icin agenda kismini netlestirmemiz lazim.", ["proposal", "client"]),
    c("TR05", "tr", "Work", "Kisa bir soru", "Backend ekibi entegrasyon testlerinin gectigini soyledi. Sprint kapsamini ve kalan task lari bugun netlestirelim mi?", ["backend", "sprint"]),

    c("TR06", "tr", "Personal", "Pazar plani", "Pazar musait misin? Gecen haftaki aksam yemeginin fisini buldum, montun da bende kalmis. Gorusunce hallederiz, hic acelesi yok.", ["receipt", "friends"]),
    c("TR07", "tr", "Personal", "Biletler", "Onumuzdeki ay icin tren biletlerini aldim. Parasini sonra konusuruz, asil sadece seni ozledigimi soylemek istedim.", ["ticket_word", "romantic"]),
    c("TR08", "tr", "Personal", "Kucuk bir rica", "Ben yokken cicekleri sular misin? Kardesim gelince yedek anahtari da ona birakman gerekecek.", ["home", "family"]),
    c("TR09", "tr", "Personal", "Iade oldu", "Brunch ta fazla cekilen tutari kafe iade etti. Senin payin daha da azaldi, bir dahaki gorusmemizde hallederiz.", ["refund_word", "friends"]),
    c("TR10", "tr", "Personal", "Baban nasil?", "Donmek zorunda degilsin, sadece babanin nasil oldugunu ve bu hafta bir seye ihtiyacin olup olmadigini sormak istedim.", ["care", "family"]),

    c("TR11", "tr", "Spam", "Dogrulama gerekli", "Hesabinizda siradisi hareket tespit edildi. Erisimin kesilmemesi icin bilgilerinizi bugun guvenli portal uzerinden dogrulayin.", ["phishing", "verification"]),
    c("TR12", "tr", "Spam", "Kargo sorunu", "Paketiniz teslim edilemedi. Adresinizi dogrulayip yeniden teslimat ucretini asagidaki linkten odeyin.", ["delivery_scam", "small_fee"]),
    c("TR13", "tr", "Spam", "Acil yardim", "Yurt disinda kaldim ve acil havale gerekiyor. Kimseyle konusmadan bana doner misin, konu gizli.", ["impersonation", "wire_transfer"]),
    c("TR14", "tr", "Spam", "Belge paylasildi", "Size gizli bir dosya paylasildi. Sifreli icerigi gorebilmek icin eki acip erisimi etkinlestirin.", ["attachment_bait", "malicious"]),
    c("TR15", "tr", "Spam", "Vergi iadesi", "Vergi iadeniz hazir ancak kart bilgileriniz ve kimliginiz dogrulanmadan odeme serbest birakilamaz.", ["refund", "fraud"]),

    c("TR16", "tr", "Finance", "Faturalandirma ozeti", "Yillik planiniz basariyla yenilendi. Fis, faturalandirma tarihi ve islem kimligi hesabinizda hazir.", ["subscription", "receipt"]),
    c("TR17", "tr", "Finance", "Fatura ektedir", "Nisan ayina ait fatura ektedir. Odeme on gun icinde yapilmali ve banka referansi altta yer aliyor.", ["invoice", "payment"]),
    c("TR18", "tr", "Finance", "Iade tamamlandi", "Iptal edilen rezervasyonunuzun iadesi orijinal kredi kartina yansitildi. Birkac is gunu icinde gorunur.", ["refund", "card"]),
    c("TR19", "tr", "Finance", "Ekstre hazir", "Aylik ekstrenizde yillik ucret ve son doneme ait tum islemler yer aliyor.", ["statement", "monthly"]),
    c("TR20", "tr", "Finance", "Chargeback sonucu", "Chargeback incelemesi lehinize sonuclandi ve gecici kredi artik kalici hale geldi.", ["chargeback", "credit"]),

    c("TR21", "tr", "Promotions", "Uyelik avantaji", "Bu hafta secili urunlerde ucretsiz kargo, bonus alisveris kredisi ve ekstra yuzde yirmi indirim sizin icin aktif.", ["discount", "member_benefits"]),
    c("TR22", "tr", "Promotions", "Tekrar stokta", "Favorilerinize eklediginiz urunler yeniden stokta ve kisa sureligine indirimde.", ["wishlist", "sale"]),
    c("TR23", "tr", "Promotions", "Seyahat firsati", "Simdi rezervasyon yapin, secili rotalarda indirimli bilet, otel kredisi ve bonus puan kazanin.", ["travel_offer", "marketing"]),
    c("TR24", "tr", "Promotions", "Size ozel teklif", "Icindeki kodu kullanarak gece yarisina kadar gecerli bu ozel teklifle alisveris yapin.", ["promo_code", "urgency"]),
    c("TR25", "tr", "Promotions", "Kurs kayitlari", "Erken kayit olanlar icin ozel teklif ve bonus icerikler hazir, bugun kaydolursaniz avantajlardan yararlanirsiniz.", ["education_marketing", "offer"]),

    c("TR26", "tr", "Social", "Yeni hareketler var", "Birisi sizi bir tartismada etiketledi, iki kisi gonderinize tepki verdi ve yeni bir baglanti isteginiz var.", ["mentions", "network"]),
    c("TR27", "tr", "Social", "Kulup guncellemesi", "Kitap kulubunde yeni mesajlar var, bir anket acildi ve bir uye yorumunuza dogrudan yanit verdi.", ["community", "messages"]),
    c("TR28", "tr", "Social", "Yeni takipciler", "Bu sabah iki hesap sizi takip etti ve baska bir kullanici son fotografiniza yorum birakti.", ["followers", "comment"]),
    c("TR29", "tr", "Social", "Davet var", "Ozel bir gruba davet edildiniz ve biri dunki bir sohbette sizi etiketledi.", ["invite", "tagged"]),
    c("TR30", "tr", "Social", "Profil etkinligi", "Dunden beri profilinizde yeni takipler, yorumlar ve mention lar dahil hareketlilik var.", ["platform", "notification"]),
]
