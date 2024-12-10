;; Donation Manager Contract

(define-data-var last-donation-id uint u0)

(define-map donations
  { donation-id: uint }
  {
    donor: principal,
    charity: principal,
    amount: uint,
    status: (string-ascii 20)
  }
)

(define-map charity-funds
  { charity: principal }
  { total-funds: uint }
)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-invalid-donation (err u102))

(define-public (donate (charity principal) (amount uint))
  (let
    (
      (new-donation-id (+ (var-get last-donation-id) u1))
      (current-funds (default-to { total-funds: u0 } (map-get? charity-funds { charity: charity })))
    )
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-set donations
      { donation-id: new-donation-id }
      {
        donor: tx-sender,
        charity: charity,
        amount: amount,
        status: "pending"
      }
    )
    (map-set charity-funds
      { charity: charity }
      { total-funds: (+ (get total-funds current-funds) amount) }
    )
    (var-set last-donation-id new-donation-id)
    (ok new-donation-id)
  )
)

(define-public (release-funds (donation-id uint))
  (let
    (
      (donation (unwrap! (map-get? donations { donation-id: donation-id }) err-invalid-donation))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (is-eq (get status donation) "pending") err-not-authorized)
    (try! (as-contract (stx-transfer? (get amount donation) tx-sender (get charity donation))))
    (map-set donations
      { donation-id: donation-id }
      (merge donation { status: "released" })
    )
    (ok true)
  )
)

(define-read-only (get-donation (donation-id uint))
  (ok (unwrap! (map-get? donations { donation-id: donation-id }) err-invalid-donation))
)

(define-read-only (get-charity-funds (charity principal))
  (ok (default-to { total-funds: u0 } (map-get? charity-funds { charity: charity })))
)

