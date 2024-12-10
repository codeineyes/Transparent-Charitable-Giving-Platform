;; Impact Measurement Contract

(define-map iot-devices
  { device-id: (string-ascii 36) }
  {
    project-id: uint,
    device-type: (string-ascii 50),
    last-reading: { timestamp: uint, value: int }
  }
)

(define-map project-impact
  { project-id: uint }
  {
    total-impact: int,
    last-updated: uint
  }
)

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-device (err u101))
(define-constant err-invalid-project (err u102))

(define-public (register-device (device-id (string-ascii 36)) (project-id uint) (device-type (string-ascii 50)))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (map-set iot-devices
      { device-id: device-id }
      {
        project-id: project-id,
        device-type: device-type,
        last-reading: { timestamp: u0, value: 0 }
      }
    )
    (ok true)
  )
)

(define-public (update-device-reading (device-id (string-ascii 36)) (timestamp uint) (value int))
  (let
    (
      (device (unwrap! (map-get? iot-devices { device-id: device-id }) err-invalid-device))
      (project (default-to { total-impact: 0, last-updated: u0 } (map-get? project-impact { project-id: (get project-id device) })))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (map-set iot-devices
      { device-id: device-id }
      (merge device { last-reading: { timestamp: timestamp, value: value } })
    )
    (map-set project-impact
      { project-id: (get project-id device) }
      {
        total-impact: (+ (get total-impact project) value),
        last-updated: timestamp
      }
    )
    (ok true)
  )
)

(define-read-only (get-device-info (device-id (string-ascii 36)))
  (ok (unwrap! (map-get? iot-devices { device-id: device-id }) err-invalid-device))
)

(define-read-only (get-project-impact (project-id uint))
  (ok (default-to { total-impact: 0, last-updated: u0 } (map-get? project-impact { project-id: project-id })))
)

