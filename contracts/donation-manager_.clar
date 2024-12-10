;; Milestone Tracker Contract

(use-trait donation-manager-trait .donation-manager.donation-manager)

(define-map project-milestones
  { project-id: uint }
  {
    charity: principal,
    milestones: (list 10 {
      description: (string-ascii 100),
      amount: uint,
      status: (string-ascii 20)
    })
  }
)

(define-data-var last-project-id uint u0)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-invalid-project (err u102))

(define-public (create-project (charity principal) (milestones (list 10 {description: (string-ascii 100), amount: uint})))
  (let
    (
      (new-project-id (+ (var-get last-project-id) u1))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (map-set project-milestones
      { project-id: new-project-id }
      {
        charity: charity,
        milestones: (map add-status milestones)
      }
    )
    (var-set last-project-id new-project-id)
    (ok new-project-id)
  )
)

(define-private (add-status (milestone {description: (string-ascii 100), amount: uint}))
  (merge milestone { status: "pending" })
)

(define-private (replace-at-index (lst (list 10 {description: (string-ascii 100), amount: uint, status: (string-ascii 20)})) (index uint) (new-item {description: (string-ascii 100), amount: uint, status: (string-ascii 20)}))
  (let ((len (len lst)))
    (if (>= index len)
      lst
      (let ((left (take index lst))
            (right (drop (+ index u1) lst)))
        (concat (concat left (list new-item)) right)))))

(define-public (complete-milestone (project-id uint) (milestone-index uint) (donation-manager <donation-manager-trait>))
  (let
    (
      (project (unwrap! (map-get? project-milestones { project-id: project-id }) err-invalid-project))
      (milestone (unwrap! (element-at (get milestones project) milestone-index) err-invalid-project))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (is-eq (get status milestone) "pending") err-not-authorized)
    (try! (contract-call? donation-manager release-funds (get amount milestone)))
    (map-set project-milestones
      { project-id: project-id }
      (merge project {
        milestones: (replace-at-index (get milestones project)
                                      milestone-index
                                      (merge milestone { status: "completed" }))
      })
    )
    (ok true)
  )
)

(define-read-only (get-project-milestones (project-id uint))
  (ok (unwrap! (map-get? project-milestones { project-id: project-id }) err-invalid-project))
)

